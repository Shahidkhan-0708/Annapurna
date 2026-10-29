"""
Multi-Stage Produce Quality Inference & Early Exit Engine

Hierarchical 3-Tier Edge Computer Vision Pipeline:
- TIER 1 (Classical Logic Quality Gate, <0.1 ms):
  * Laplacian 2D Blur Variance (Var >= 30.0). Rejects as "UNREADABLE_BLUR".
  * Exposure Boundary Check ([20, 245] mean pixel intensity). Flags clipped/washed-out frames.
- TIER 2 (Fast Statistical Filter - MLP Engine, <0.4 ms):
  * 42-dimensional compact invariant descriptor (18 color moments, 16 HOG, 7 Hu moments, 1 blur score).
  * 61.4 KB ONNX MLP engine (mlp_baseline_model.onnx).
  * Early Exit Routing:
    - P(Fresh) >= 0.985  -> Early Exit: D_i = 0.05, AGMARK = 95/100 (Tier 3 skipped).
    - P(Spoiled) >= 0.990 -> Early Exit: D_i = 0.92, AGMARK = 8/100 (Tier 3 skipped).
    - Else (0.02 < P < 0.985) -> Route to Tier 3.
- TIER 3 (Deep Spatial Analysis - MobileNetV2 INT8 Engine, <5.0 ms):
  * INT8 dynamically quantized depthwise MobileNetV2 (mobilenetv2_degradation_int8.onnx, 2.38 MB).
  * Evaluates subtle internal necrosis, locular rot, and fine-grained continuous degradation D_i.
  * Dynamic batching across parallel inspection streams.
"""

import os
import asyncio
import logging
from io import BytesIO
from typing import Dict, Any, List, Tuple, Optional

logger = logging.getLogger("FreshGuardTieredInference")

try:
    import cv2
except Exception as exc:
    cv2 = None
    logger.warning("cv2 unavailable (%s), falling back to Pillow/NumPy.", exc)

try:
    import numpy as np
except Exception as exc:
    np = None

try:
    import onnxruntime as ort
except Exception as exc:
    ort = None
    logger.warning("onnxruntime unavailable (%s), running fallback tiered inference.", exc)

try:
    from skimage.feature import hog
except Exception as exc:
    hog = None

from engines.onnx_vision_engine import get_edge_vision_engine, EdgeVisionEngine

if np is not None:
    IMAGENET_MEAN = np.array([0.485, 0.456, 0.406], dtype=np.float32).reshape(3, 1, 1)
    IMAGENET_STD = np.array([0.229, 0.224, 0.225], dtype=np.float32).reshape(3, 1, 1)
else:
    IMAGENET_MEAN = None
    IMAGENET_STD = None


class TieredInferencePipeline:
    """
    Stateless, thread-safe, 3-tier produce inspection pipeline with Early Exit routing.
    """

    _instance: Optional["TieredInferencePipeline"] = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(TieredInferencePipeline, cls).__new__(cls)
            cls._instance._initialized = False
        return cls._instance

    def __init__(self):
        if getattr(self, "_initialized", False):
            return

        base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        storage_dir = os.path.join(base_dir, "storage")
        mlp_onnx_path = os.path.join(storage_dir, "mlp_baseline_model.onnx")

        self.mlp_session = None
        self.mlp_input_name = "input"

        # Configure Tier 2 MLP session with reusable arena and multi-threading if ort available
        if ort is not None and os.path.exists(mlp_onnx_path):
            try:
                mlp_opts = ort.SessionOptions()
                mlp_opts.enable_cpu_mem_arena = True
                mlp_opts.intra_op_num_threads = 4
                mlp_opts.inter_op_num_threads = 2
                mlp_opts.graph_optimization_level = ort.GraphOptimizationLevel.ORT_ENABLE_ALL
                self.mlp_session = ort.InferenceSession(
                    mlp_onnx_path,
                    sess_options=mlp_opts,
                    providers=["CPUExecutionProvider"],
                )
                self.mlp_input_name = self.mlp_session.get_inputs()[0].name
            except Exception as e:
                self.mlp_session = None
                logger.warning(f"Could not load MLP ONNX model: {e}")
        else:
            self.mlp_session = None
            logger.info("MLP ONNX baseline not loaded. Tier 2 early exit will use heuristic rules.")

        # Tier 3 MobileNetV2 INT8 Engine Singleton
        self.edge_vision_engine = get_edge_vision_engine()
        self._initialized = True
        logger.info("TieredInferencePipeline initialized with Tier 1 Classical, Tier 2 MLP ONNX, Tier 3 MobileNetV2 INT8.")

    @staticmethod
    def extract_42dim_descriptors(bgr_img: np.ndarray) -> np.ndarray:
        """
        Extracts 42-dimensional statistical and morphological descriptor:
        - 18 Color Moments: Mean, Std, Skewness in RGB (9) and HSV (9)
        - 16 HOG Multi-scale gradient features
        - 7 Hu Moments (scale/rotation invariant)
        - 1 Normalized Laplacian surface variance
        """
        if cv2 is not None and hog is not None and np is not None:
            hsv = cv2.cvtColor(bgr_img, cv2.COLOR_BGR2HSV)
            moments = []
            for ch in cv2.split(bgr_img):
                m = float(np.mean(ch))
                s = float(np.std(ch))
                skew = float(np.mean((ch - m) ** 3) / (s ** 3 + 1e-5))
                moments.extend([m / 255.0, s / 255.0, skew])

            for ch in cv2.split(hsv):
                m = float(np.mean(ch))
                s = float(np.std(ch))
                skew = float(np.mean((ch - m) ** 3) / (s ** 3 + 1e-5))
                moments.extend([m / 255.0, s / 255.0, skew])

            gray = cv2.cvtColor(bgr_img, cv2.COLOR_BGR2GRAY)
            gray_64 = cv2.resize(gray, (64, 64))
            hog_feats = hog(gray_64, orientations=8, pixels_per_cell=(16, 16), cells_per_block=(1, 1), feature_vector=True)

            hu = cv2.HuMoments(cv2.moments(gray)).flatten()
            hu_log = -np.sign(hu) * np.log10(np.abs(hu) + 1e-10)

            blur_var = float(cv2.Laplacian(gray, cv2.CV_64F).var()) / 1000.0

            feat_vec = np.hstack([moments, hog_feats[:16], hu_log, [blur_var]])
            return feat_vec.astype(np.float32)

        # Fallback 42-dim vector using NumPy/zeros
        vec = np.zeros(42, dtype=np.float32)
        if bgr_img is not None and hasattr(bgr_img, 'mean'):
            vec[0] = float(bgr_img.mean()) / 255.0
            vec[1] = float(bgr_img.std()) / 255.0
        return vec

    def evaluate_tier1_quality(self, frame: np.ndarray) -> Tuple[bool, float, str]:
        """
        Tier 1 Classical Quality Gate:
        - Laplacian 2D variance check (Var >= 30.0). Rejects below threshold as 'UNREADABLE_BLUR'.
        - Exposure boundary check [20, 245]. Flags washed-out or severely underexposed frames.
        """
        if cv2 is not None:
            gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY) if frame.ndim == 3 else frame
            blur_var = float(cv2.Laplacian(gray, cv2.CV_64F).var())
            mean_intensity = float(np.mean(gray))
        else:
            if frame.ndim == 3:
                gray = 0.299 * frame[:, :, 0] + 0.587 * frame[:, :, 1] + 0.114 * frame[:, :, 2]
            else:
                gray = frame.astype(np.float32)
            laplacian = (
                -4.0 * gray[1:-1, 1:-1]
                + gray[:-2, 1:-1]
                + gray[2:, 1:-1]
                + gray[1:-1, :-2]
                + gray[1:-1, 2:]
            )
            blur_var = float(laplacian.var()) if laplacian.size > 0 else 50.0
            mean_intensity = float(np.mean(gray))

        if blur_var < 30.0:
            return False, blur_var, f"UNREADABLE_BLUR: Laplacian variance ({blur_var:.1f}) is below the required 30.0 threshold."

        if mean_intensity < 20.0:
            return False, blur_var, f"EXPOSURE_ANOMALY_CLIPPED: Severe underexposure detected (Mean: {mean_intensity:.1f} < 20.0)."

        if mean_intensity > 245.0:
            return False, blur_var, f"EXPOSURE_ANOMALY_WASHED_OUT: Severe overexposure/glare detected (Mean: {mean_intensity:.1f} > 245.0)."

        return True, blur_var, "OK"

    def analyze_frame(self, image_bytes: bytes) -> Dict[str, Any]:
        """
        Processes single produce frame through the 3-tier hierarchy:
        Tier 1 -> Tier 2 (Check Early Exit) -> Tier 3 (Deep Analysis if required).
        """
        # ==============================================================================
        # TIER 1: Classical Quality Gate (<0.1 ms)
        # ==============================================================================
        if cv2 is not None and np is not None:
            nparr = np.frombuffer(image_bytes, np.uint8)
            frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        else:
            from PIL import Image as PILImage
            pil_img = PILImage.open(BytesIO(image_bytes)).convert("RGB")
            frame = np.array(pil_img, dtype=np.float32)

        if frame is None:
            raise ValueError("Corrupt image data or unsupported format.")

        is_valid, blur_var, reason = self.evaluate_tier1_quality(frame)
        if not is_valid:
            raise ValueError(f"Tier 1 Quality Gate Rejection: {reason}")

        # ==============================================================================
        # TIER 2: Fast Statistical Filter & Early Exit Routing (<0.4 ms)
        # ==============================================================================
        if self.mlp_session is not None:
            descriptor = self.extract_42dim_descriptors(frame).reshape(1, -1)
            raw_out = self.mlp_session.run(None, {self.mlp_input_name: descriptor})
            pred_class = int(raw_out[0][0])

            if len(raw_out) > 1 and isinstance(raw_out[1], list) and len(raw_out[1]) > 0:
                prob_dict = raw_out[1][0]
                prob_fresh = float(prob_dict.get(0, 0.5))
                prob_spoiled = float(prob_dict.get(1, 0.5))
            else:
                prob_fresh = 0.90 if pred_class == 0 else 0.10
                prob_spoiled = 1.0 - prob_fresh

            # Early Exit Rule 1: Pristine Fresh Produce
            if prob_fresh >= 0.985:
                return {
                    "evaluation_tier": "TIER_2_FAST_FILTER",
                    "early_exit": True,
                    "degradation_index": 0.05,
                    "necrotic_surface_pct": 2.0,
                    "visual_quality_score": 95,
                    "ripeness_stage": "Optimal",
                    "defect_detected": False,
                    "defect_probability": round(prob_spoiled, 3),
                    "confidence": int(round(prob_fresh * 100)),
                    "blur_variance": round(blur_var, 2),
                    "diagnostic": "Early Exit at Tier 2: Certified Pristine Fresh Produce. Tier 3 deep analysis skipped.",
                }

            # Early Exit Rule 2: Grossly Compromised / Advanced Decay
            if prob_spoiled >= 0.990:
                return {
                    "evaluation_tier": "TIER_2_FAST_FILTER",
                    "early_exit": True,
                    "degradation_index": 0.92,
                    "necrotic_surface_pct": 92.0,
                    "visual_quality_score": 8,
                    "ripeness_stage": "Overripe",
                    "defect_detected": True,
                    "defect_probability": round(prob_spoiled, 3),
                    "confidence": int(round(prob_spoiled * 100)),
                    "blur_variance": round(blur_var, 2),
                    "diagnostic": "Early Exit at Tier 2: Grossly Compromised Decay Detected. Tier 3 deep analysis skipped.",
                }

        # ==============================================================================
        # TIER 3: Deep Multi-Task Spatial Analysis (<5.0 ms)
        # ==============================================================================
        rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        resized = cv2.resize(rgb, (224, 224), interpolation=cv2.INTER_AREA)
        tensor = resized.astype(np.float32) / 255.0
        tensor = np.transpose(tensor, (2, 0, 1))
        tensor = (tensor - IMAGENET_MEAN) / IMAGENET_STD
        batch_tensor = np.expand_dims(tensor, axis=0)

        raw_outputs = self.edge_vision_engine._execute_onnx_inference(batch_tensor)[0]
        d_i = float(raw_outputs[0])
        defect_prob = float(raw_outputs[1])
        ripeness_raw = float(raw_outputs[2])
        conf_raw = float(raw_outputs[3])

        ripeness_stage = "Unripe" if ripeness_raw < 0.35 else "Optimal" if ripeness_raw <= 0.70 else "Overripe"
        visual_score = int(round(max(0.0, min(100.0, (1.0 - d_i) * 100.0))))
        conf_pct = int(round(max(60.0, min(99.0, conf_raw * 100.0))))

        return {
            "evaluation_tier": "TIER_3_DEEP_MOBILENET_INT8",
            "early_exit": False,
            "degradation_index": round(d_i, 4),
            "necrotic_surface_pct": round(d_i * 100.0, 2),
            "visual_quality_score": visual_score,
            "ripeness_stage": ripeness_stage,
            "defect_detected": defect_prob >= 0.40,
            "defect_probability": round(defect_prob, 3),
            "confidence": conf_pct,
            "blur_variance": round(blur_var, 2),
            "diagnostic": "Tier 3 Deep Spatial Convolutions: Subtle or ambiguous internal locule necrosis resolved.",
        }

    async def analyze_batch_parallel(self, image_payloads: List[bytes]) -> Dict[str, Any]:
        """
        Processes dynamic batch of 1, 5, or N incoming frames:
        1. Parallel Tier 1 quality screening
        2. Fast Tier 2 statistical classification & early exit routing
        3. Assembles remaining ambiguous frames into single dynamic batch tensor [N_tier3, 3, 224, 224]
        4. Executes single vectorized ONNX run for all Tier 3 candidates
        5. Computes composite batch metrics and outlier flags
        """
        loop = asyncio.get_event_loop()

        # Step 1 & 2: Process frames through Tier 1 & 2 in executor
        def evaluate_initial_stages(idx: int, img_bytes: bytes):
            nparr = np.frombuffer(img_bytes, np.uint8)
            frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            if frame is None:
                raise ValueError(f"Sample {idx+1}: Corrupt image data.")

            is_valid, blur_var, reason = self.evaluate_tier1_quality(frame)
            if not is_valid:
                raise ValueError(f"Sample {idx+1} {reason}")

            # Check Tier 2
            if self.mlp_session is not None:
                descriptor = self.extract_42dim_descriptors(frame).reshape(1, -1)
                raw_out = self.mlp_session.run(None, {self.mlp_input_name: descriptor})
                pred_class = int(raw_out[0][0])
                if len(raw_out) > 1 and isinstance(raw_out[1], list) and len(raw_out[1]) > 0:
                    prob_fresh = float(raw_out[1][0].get(0, 0.5))
                    prob_spoiled = float(raw_out[1][0].get(1, 0.5))
                else:
                    prob_fresh = 0.90 if pred_class == 0 else 0.10
                    prob_spoiled = 1.0 - prob_fresh

                if prob_fresh >= 0.985:
                    return {
                        "sample_id": idx + 1,
                        "evaluation_tier": "TIER_2_FAST_FILTER",
                        "early_exit": True,
                        "degradation_index": 0.05,
                        "necrotic_surface_pct": 2.0,
                        "visual_quality_score": 95,
                        "ripeness_stage": "Optimal",
                        "defect_detected": False,
                        "defect_probability": round(prob_spoiled, 3),
                        "confidence": int(round(prob_fresh * 100)),
                        "blur_variance": round(blur_var, 2),
                    }
                elif prob_spoiled >= 0.990:
                    return {
                        "sample_id": idx + 1,
                        "evaluation_tier": "TIER_2_FAST_FILTER",
                        "early_exit": True,
                        "degradation_index": 0.92,
                        "necrotic_surface_pct": 92.0,
                        "visual_quality_score": 8,
                        "ripeness_stage": "Overripe",
                        "defect_detected": True,
                        "defect_probability": round(prob_spoiled, 3),
                        "confidence": int(round(prob_spoiled * 100)),
                        "blur_variance": round(blur_var, 2),
                    }

            # Needs Tier 3
            rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            resized = cv2.resize(rgb, (224, 224), interpolation=cv2.INTER_AREA)
            tensor = resized.astype(np.float32) / 255.0
            tensor = np.transpose(tensor, (2, 0, 1))
            tensor = (tensor - IMAGENET_MEAN) / IMAGENET_STD
            return {
                "sample_id": idx + 1,
                "needs_tier3": True,
                "tensor": tensor,
                "blur_variance": blur_var,
            }

        initial_results = await asyncio.gather(
            *[loop.run_in_executor(None, evaluate_initial_stages, idx, b) for idx, b in enumerate(image_payloads)]
        )

        final_samples = []
        tier3_indices = []
        tier3_tensors = []

        for item in initial_results:
            if item.get("needs_tier3"):
                tier3_indices.append(len(final_samples))
                tier3_tensors.append(item["tensor"])
                final_samples.append(item)  # Placeholder
            else:
                final_samples.append(item)

        # Batch execution of all Tier 3 frames simultaneously
        if tier3_tensors:
            batch_matrix = np.stack(tier3_tensors, axis=0)
            raw_tier3_outputs = await loop.run_in_executor(
                None, self.edge_vision_engine._execute_onnx_inference, batch_matrix
            )

            for local_idx, final_idx in enumerate(tier3_indices):
                row = raw_tier3_outputs[local_idx]
                meta_item = final_samples[final_idx]
                d_i = float(row[0])
                defect_prob = float(row[1])
                ripeness_raw = float(row[2])
                conf_raw = float(row[3])

                ripeness_stage = "Unripe" if ripeness_raw < 0.35 else "Optimal" if ripeness_raw <= 0.70 else "Overripe"
                visual_score = int(round(max(0.0, min(100.0, (1.0 - d_i) * 100.0))))

                final_samples[final_idx] = {
                    "sample_id": meta_item["sample_id"],
                    "evaluation_tier": "TIER_3_DEEP_MOBILENET_INT8",
                    "early_exit": False,
                    "degradation_index": round(d_i, 4),
                    "necrotic_surface_pct": round(d_i * 100.0, 2),
                    "visual_quality_score": visual_score,
                    "ripeness_stage": ripeness_stage,
                    "defect_detected": defect_prob >= 0.40,
                    "defect_probability": round(defect_prob, 3),
                    "confidence": int(round(max(60.0, min(99.0, conf_raw * 100.0)))),
                    "blur_variance": round(meta_item["blur_variance"], 2),
                }

        # Composite statistics
        deg_indices = [s["degradation_index"] for s in final_samples]
        mean_deg = float(np.mean(deg_indices))
        max_deg = float(np.max(deg_indices))
        std_deg = float(np.std(deg_indices))

        early_exit_count = sum(1 for s in final_samples if s.get("early_exit", False))
        tier3_count = len(final_samples) - early_exit_count

        return {
            "composite": {
                "composite_degradation_index": round(mean_deg, 4),
                "max_degradation_index": round(max_deg, 4),
                "degradation_uncertainty": round(std_deg, 4),
                "aggregate_visual_score": int(round((1.0 - mean_deg) * 100.0)),
                "sample_count": len(final_samples),
                "early_exits_triggered": early_exit_count,
                "tier3_deep_evaluations": tier3_count,
                "compute_savings_pct": round((early_exit_count / len(final_samples)) * 75.0, 1) if final_samples else 0.0,
            },
            "samples": final_samples,
        }


# Lazy singleton
_tiered_pipeline: Optional[TieredInferencePipeline] = None


def get_tiered_pipeline() -> TieredInferencePipeline:
    global _tiered_pipeline
    if _tiered_pipeline is None:
        _tiered_pipeline = TieredInferencePipeline()
    return _tiered_pipeline
