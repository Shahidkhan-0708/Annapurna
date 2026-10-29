"""
Vision Analysis Router

Crop vision analysis endpoints for mobile app and edge devices:
- Single-image vision analysis via 3-tier pipeline
- 5-sample AGMARK batch vision analysis with continuous degradation index D_i
- Offline-first MobileNetV2 ONNX edge inference endpoint
Supports WebP, JPEG, PNG formats.
"""

import hashlib
import asyncio
from io import BytesIO
import logging
from typing import Optional
from PIL import Image, UnidentifiedImageError
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from starlette.datastructures import UploadFile as StarletteUploadFile
from auth import get_current_user, get_optional_user
from engines.vision import run_vision_sensor_layer
from engines.onnx_vision_engine import get_edge_vision_engine
from engines.tiered_inference_pipeline import get_tiered_pipeline
from models import VisionAgronomySchema

logger = logging.getLogger("FreshGuardVisionRouter")
router = APIRouter(tags=["vision"])
MAX_SAMPLE_BYTES = 10 * 1024 * 1024


@router.post("/api/v5/vision/analyze", response_model=VisionAgronomySchema)
async def analyze_image(
    file: UploadFile = File(...),
    user: Optional[dict] = Depends(get_optional_user),
):
    """
    Analyze a single crop image using the 3-tier vision pipeline.
    
    Returns structured AGMARK grading parameters:
    - crop_identified
    - visual_quality_score (0-100)
    - ripeness_stage (Unripe | Optimal | Overripe)
    - fungal_pathogen_presence (boolean)
    """
    try:
        allowed_types = {"image/jpeg", "image/png", "image/webp"}
        if file.content_type not in allowed_types:
            raise HTTPException(
                status_code=400, 
                detail=f"Unsupported image format. Allowed: {', '.join(allowed_types)}"
            )

        vision_metrics = await run_vision_sensor_layer(file)
        
        return VisionAgronomySchema(
            crop_identified=vision_metrics.crop_identified,
            visual_quality_score=vision_metrics.visual_quality_score,
            ripeness_stage=vision_metrics.ripeness_stage,
            fungal_pathogen_presence=vision_metrics.fungal_pathogen_presence,
            confidence=vision_metrics.confidence,
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Vision analysis failed: {str(e)}")
        raise HTTPException(status_code=500, detail="Vision analysis failed. Please try again.")


@router.post("/api/v5/vision/analyze-batch")
async def analyze_batch_images(
    files: list[UploadFile] = File(...),
    user: Optional[dict] = Depends(get_optional_user),
):
    """
    Analyze multiple crop images (5-sample protocol).
    Returns aggregated results with continuous biological degradation indices (D_i).
    """
    if len(files) != 5:
        raise HTTPException(status_code=400, detail="Exactly 5 distinct samples are required")

    try:
        seen_hashes = set()
        payloads = []
        for idx, file in enumerate(files):
            allowed_types = {"image/jpeg", "image/png", "image/webp"}
            if file.content_type not in allowed_types:
                raise HTTPException(
                    status_code=400, 
                    detail=f"Sample {idx+1}: Unsupported image format"
                )
                
            file_bytes = await file.read()
            if not file_bytes:
                raise HTTPException(status_code=400, detail=f"Sample {idx+1}: Empty image")
            if len(file_bytes) > MAX_SAMPLE_BYTES:
                raise HTTPException(status_code=413, detail=f"Sample {idx+1}: Image exceeds 10 MB limit")
            try:
                with Image.open(BytesIO(file_bytes)) as image:
                    image.verify()
            except (UnidentifiedImageError, OSError, Image.DecompressionBombError):
                raise HTTPException(status_code=400, detail=f"Sample {idx+1}: Invalid or unsafe image")
            file_hash = hashlib.sha256(file_bytes).hexdigest()
            if file_hash in seen_hashes:
                raise HTTPException(
                    status_code=400,
                    detail="Duplicate sample images detected. Please provide distinct 5-fruit samples."
                )
            seen_hashes.add(file_hash)
            payloads.append((idx, file_bytes, file.content_type))

        async def analyze_sample(sample):
            idx, image_bytes, content_type = sample
            upload = StarletteUploadFile(
                file=BytesIO(image_bytes),
                filename=f"sample_{idx + 1}",
                headers={"content-type": content_type},
            )
            vision_metrics = await run_vision_sensor_layer(upload)
            
            # Map visual quality score to continuous degradation index D_i in [0.0, 1.0]
            v_score = vision_metrics.visual_quality_score
            d_i = max(0.0, min(1.0, (100.0 - v_score) / 100.0))

            return {
                "sequence": idx + 1,
                "crop_identified": vision_metrics.crop_identified,
                "visual_quality_score": v_score,
                "degradation_index": round(d_i, 4),
                "necrotic_surface_pct": round(d_i * 100.0, 2),
                "ripeness_stage": vision_metrics.ripeness_stage,
                "fungal_pathogen_presence": vision_metrics.fungal_pathogen_presence,
                "confidence": vision_metrics.confidence,
            }

        results = await asyncio.gather(*(analyze_sample(sample) for sample in payloads))

        # Aggregate results
        avg_score = sum(r["visual_quality_score"] for r in results) / len(results)
        ripeness_votes = [r["ripeness_stage"] for r in results]
        ripeness_stage = max(set(ripeness_votes), key=ripeness_votes.count)
        pathogen_detected = any(r["fungal_pathogen_presence"] for r in results)
        composite_d_i = round(sum(r["degradation_index"] for r in results) / len(results), 4)
        max_d_i = round(max(r["degradation_index"] for r in results), 4)

        if composite_d_i < 0.25 and max_d_i < 0.45 and not pathogen_detected:
            op_status = "CERTIFIED_FRESH_METRO_SAFE"
        elif composite_d_i < 0.45 and max_d_i < 0.65:
            op_status = "ELEVATED_RESPIRATION_MONITOR"
        else:
            op_status = "HIGH_DISTRESS_TRIGGER_SALVAGE"

        return {
            "aggregated": {
                "crop_identified": results[0]["crop_identified"],
                "visual_quality_score": round(avg_score),
                "composite_degradation_index": composite_d_i,
                "max_degradation_index": max_d_i,
                "ripeness_stage": ripeness_stage,
                "fungal_pathogen_presence": pathogen_detected,
                "sample_count": len(results),
                "confidence": round(sum(r["confidence"] for r in results) / len(results)),
                "operational_status": op_status,
            },
            "individual_results": results,
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Batch vision analysis failed: {str(e)}")
        raise HTTPException(status_code=500, detail="Batch vision analysis failed.")


@router.post("/api/v5/vision/analyze-edge-onnx")
async def analyze_batch_edge_onnx(
    files: list[UploadFile] = File(...),
    user: Optional[dict] = Depends(get_optional_user),
):
    """
    Offline-First MobileNetV2 ONNX Edge Inference Endpoint.
    - Validates 5 distinct AGMARK samples
    - Evaluates 2D Laplacian sharpness guardrails (Var >= 30.0)
    - Executes concurrent non-blocking batch inference on [5, 3, 224, 224] tensor
    - Returns continuous biological degradation index D_i, defect flags, and outlier detection
    """
    if len(files) != 5:
        raise HTTPException(status_code=400, detail="AGMARK protocol requires exactly 5 distinct samples")

    try:
        seen_hashes = set()
        image_payloads = []

        for idx, file in enumerate(files):
            allowed_types = {"image/jpeg", "image/png", "image/webp"}
            if file.content_type not in allowed_types:
                raise HTTPException(
                    status_code=400, 
                    detail=f"Sample {idx+1}: Unsupported format ({file.content_type})"
                )

            file_bytes = await file.read()
            if not file_bytes:
                raise HTTPException(status_code=400, detail=f"Sample {idx+1}: File is empty")
            if len(file_bytes) > MAX_SAMPLE_BYTES:
                raise HTTPException(status_code=413, detail=f"Sample {idx+1}: Exceeds 10 MB limit")

            file_hash = hashlib.sha256(file_bytes).hexdigest()
            if file_hash in seen_hashes:
                raise HTTPException(
                    status_code=400,
                    detail=f"Sample {idx+1} is duplicate of earlier sample. Distinct depth samples required."
                )
            seen_hashes.add(file_hash)
            image_payloads.append(file_bytes)

        # Run high-performance ONNX Edge Engine
        engine = get_edge_vision_engine()
        result = await engine.predict_batch(image_payloads)
        return result

    except HTTPException:
        raise
    except ValueError as ve:
        logger.warning(f"Edge ONNX quality gate failed: {ve}")
        raise HTTPException(status_code=422, detail=f"Image quality guardrail failure: {str(ve)}")
    except Exception as e:
        logger.error(f"Edge ONNX inference failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Edge ONNX analysis failed: {str(e)}")


@router.post("/api/v5/vision/analyze-tiered-batch")
async def analyze_tiered_batch_images(
    files: list[UploadFile] = File(...),
    user: Optional[dict] = Depends(get_optional_user),
):
    """
    3-Tier Hierarchical Produce Inspection Endpoint with Early Exit.
    - Tier 1: Classical sharpness and exposure gate (<0.1 ms)
    - Tier 2: 42-dim HOG & color moment statistical filter with Early Exit (<0.4 ms)
    - Tier 3: Deep INT8 MobileNetV2 depthwise analysis (<5.0 ms)
    Maximizes compute efficiency across dynamic inspection line batches.
    """
    if len(files) == 0:
        raise HTTPException(status_code=400, detail="At least 1 produce sample image is required")

    try:
        seen_hashes = set()
        image_payloads = []

        for idx, file in enumerate(files):
            allowed_types = {"image/jpeg", "image/png", "image/webp"}
            if file.content_type not in allowed_types:
                raise HTTPException(
                    status_code=400, 
                    detail=f"Sample {idx+1}: Unsupported format ({file.content_type})"
                )

            file_bytes = await file.read()
            if not file_bytes:
                raise HTTPException(status_code=400, detail=f"Sample {idx+1}: File is empty")
            if len(file_bytes) > MAX_SAMPLE_BYTES:
                raise HTTPException(status_code=413, detail=f"Sample {idx+1}: Exceeds 10 MB limit")

            file_hash = hashlib.sha256(file_bytes).hexdigest()
            if file_hash in seen_hashes:
                raise HTTPException(
                    status_code=400,
                    detail=f"Sample {idx+1} is duplicate of earlier sample. Distinct samples required."
                )
            seen_hashes.add(file_hash)
            image_payloads.append(file_bytes)

        pipeline = get_tiered_pipeline()
        result = await pipeline.analyze_batch_parallel(image_payloads)
        return result

    except HTTPException:
        raise
    except ValueError as ve:
        logger.warning(f"Tiered quality gate failed: {ve}")
        raise HTTPException(status_code=422, detail=f"Tier 1/2 quality screening rejection: {str(ve)}")
    except Exception as e:
        logger.error(f"Tiered batch analysis failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Tiered batch analysis failed: {str(e)}")

