from fastapi import FastAPI, HTTPException, Query, Request
from motor.motor_asyncio import AsyncIOMotorClient
from typing import List, Optional
from .models import Call, CallUpdate, Property, PropertyUpdate
import os
import uuid
from datetime import datetime, timezone, timedelta
import logging
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from fastapi.encoders import jsonable_encoder  # ★ 추가: ObjectId 등을 문자열로 변환

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s - %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger(__name__)

MONGODB_URI = os.getenv("MONGODB_URI")
WORK_MONGODB_DB = os.getenv("WORK_MONGODB_DB", "mars_work_db")

client = AsyncIOMotorClient(MONGODB_URI)
work_db = client[WORK_MONGODB_DB]

app = FastAPI(title="Database Service")

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.exception(f"Unhandled error: {exc} - Path: {request.url.path}")
    return JSONResponse(
        status_code=500,
        content={"detail": "내부 서버 오류가 발생했습니다."},
    )

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    logger.warning(f"Validation error: {exc} - Path: {request.url.path}")
    return JSONResponse(
        status_code=422,
        content={"detail": exc.errors(), "body": exc.body},
    )

# ---------------------------------------------------------------------
# 1. Calls
# ---------------------------------------------------------------------

@app.get("/calls/", response_model=dict)
async def list_calls(
    limit: Optional[int] = Query(10, ge=1),
    offset: Optional[int] = Query(0, ge=0),
    customer_contact: Optional[str] = Query(None),
    customer_name: Optional[str] = Query(None),
    property_name: Optional[str] = Query(None),
    recording_date: Optional[datetime] = Query(None),  # datetime 타입으로 유지
    before_date: Optional[datetime] = Query(None),
    after_date: Optional[datetime] = Query(None),
    created_by: Optional[str] = Query(None),
    exclude_property_names: Optional[List[str]] = Query(None),  # 제외할 property_name 목록
):
    """
    통화 기록 목록 조회
    """
    try:
        logger.info(f"Listing calls with parameters: {locals()}")

        query = {}

        # 필터링 조건 추가
        if customer_contact:
            query["customer_contact"] = {"$regex": customer_contact, "$options": "i"}
        if customer_name:
            query["customer_name"] = {"$regex": customer_name, "$options": "i"}
        if property_name:
            if property_name == '기타' and exclude_property_names:
                regex_pattern = '|'.join(exclude_property_names)
                query["extracted_property_info.property_name"] = {
                    "$not": {
                        "$regex": regex_pattern,
                        "$options": "i"
                    }
                }
                logger.info(f"Excluding property names with regex: {regex_pattern}")
            else:
                query["extracted_property_info.property_name"] = {"$regex": property_name, "$options": "i"}
        if created_by:
            query["created_by"] = created_by

        # recording_date 필터링 (날짜 범위 설정)
        if recording_date:
            # 클라이언트가 시간 부분을 00:00:00으로 설정했다고 가정
            start_datetime = recording_date
            end_datetime = start_datetime + timedelta(days=1)
            query["recording_date"] = {
                "$gte": start_datetime,
                "$lt": end_datetime
            }
            logger.info(f"Recording date range: {start_datetime} to {end_datetime}")

        # before_date 필터링
        if before_date:
            if "recording_date" not in query:
                query["recording_date"] = {}
            query["recording_date"]["$lt"] = before_date
            logger.info(f"Before date: {before_date}")

        # after_date 필터링
        if after_date:
            if "recording_date" not in query:
                query["recording_date"] = {}
            query["recording_date"]["$gt"] = after_date
            logger.info(f"After date: {after_date}")

        logger.info(f"Final Query: {query}")
        total_count = await work_db.calls.count_documents(query)

        calls = []
        cursor = work_db.calls.find(query).sort("recording_date", -1).skip(offset).limit(limit)
        async for call_doc in cursor:
            # Pydantic 모델로 파싱하여 ObjectId -> str 변환 가능
            call_model = Call(**call_doc)
            calls.append(call_model)

        logger.info(f"Retrieved {len(calls)} calls out of {total_count} total.")

        # dict로 감싼 뒤 jsonable_encoder를 사용해 직렬화
        return jsonable_encoder({
            "results": calls,
            "totalCount": total_count
        })

    except Exception as e:
        logger.exception("List calls error:")
        raise HTTPException(status_code=500, detail="내부 서버 오류가 발생했습니다.")


@app.get("/calls/{call_id}", response_model=Call)
async def read_call(call_id: str):
    """
    단일 통화 기록 조회
    """
    try:
        logger.info(f"Reading call with job_id: {call_id}")
        call_doc = await work_db.calls.find_one({"job_id": call_id})
        if call_doc is None:
            logger.warning(f"Call not found: {call_id}")
            raise HTTPException(status_code=404, detail="Call not found")
        call_model = Call.model_validate(call_doc)
        logger.info(f"Read Call: {call_doc}")
        return call_model

    except Exception as e:
        logger.exception(f"Read call error for job_id {call_id}:")
        raise HTTPException(status_code=500, detail="내부 서버 오류가 발생했습니다.")


@app.put("/calls/{call_id}", response_model=Call)
async def update_call(call_id: str, call_update: CallUpdate):
    """
    통화 기록 업데이트
    """
    try:
        logger.info(f"Updating call with job_id: {call_id} and data: {call_update}")
        update_data = call_update.model_dump(exclude_unset=True)

        result = await work_db.calls.update_one(
            {"job_id": call_id},
            {"$set": update_data}
        )

        if result.matched_count == 0:
            logger.warning(f"Call not found for update: {call_id}")
            raise HTTPException(status_code=404, detail="Call not found")

        if result.modified_count == 0:
            logger.info(f"No changes made to call: {call_id}")
            updated_call_doc = await work_db.calls.find_one({"job_id": call_id})
            updated_call_model = Call.model_validate(updated_call_doc)
            return updated_call_model

        updated_call_doc = await work_db.calls.find_one({"job_id": call_id})
        logger.info(f"Updated Call: {updated_call_model}")

        if not updated_call_doc:
            raise HTTPException(status_code=404, detail="Call not found after update.")

        updated_call_model = Call.model_validate(updated_call_doc)
        return updated_call_model

    except HTTPException as he:
        raise he
    except Exception as e:
        logger.exception(f"Update call error for job_id {call_id}: {e}")
        raise HTTPException(status_code=500, detail="내부 서버 오류가 발생했습니다.")


@app.delete("/calls/{call_id}")
async def delete_call(call_id: str):
    """
    통화 기록 삭제
    - 통화 기록 삭제 시, 해당 문서의 property_id와 job_id를 이용하여
      연관된 property 문서에서 call_job_ids 배열 내 해당 job_id를 제거합니다.
    """
    try:
        logger.info(f"Deleting call with job_id: {call_id}")
        
        # 삭제할 call 문서를 먼저 조회하여 연관 정보(property_id, job_id)를 가져옴
        call_doc = await work_db.calls.find_one({"job_id": call_id})
        if not call_doc:
            logger.warning(f"Call not found for deletion: {call_id}")
            raise HTTPException(status_code=404, detail="Call not found")
        
        property_id = call_doc.get("property_id")
        call_job_id = call_doc.get("job_id")  # 보통 call_id와 동일하지만 명시적으로 사용

        # call 문서 삭제
        result = await work_db.calls.delete_one({"job_id": call_id})
        if result.deleted_count == 0:
            logger.warning(f"Call not deleted: {call_id}")
            raise HTTPException(status_code=404, detail="Call not deleted")

        # 만약 해당 call 문서가 property_id를 가지고 있다면,
        # property 문서에서 call_job_ids 배열 내 해당 job_id를 제거합니다.
        if property_id and call_job_id:
            update_result = await work_db.properties.update_one(
                {"property_id": property_id},
                {"$pull": {"call_job_ids": call_job_id}}
            )
            logger.info(
                f"Updated property {property_id}: removed call_job_id {call_job_id} "
                f"from call_job_ids (modified count: {update_result.modified_count})"
            )

        logger.info(f"Deleted Call: {call_id}")
        return {"detail": "Call deleted"}

    except Exception as e:
        logger.exception(f"Delete call error for job_id {call_id}: {e}")
        raise HTTPException(status_code=500, detail="내부 서버 오류가 발생했습니다.")


# ---------------------------------------------------------------------
# 2. Properties
# ---------------------------------------------------------------------

@app.get("/properties/", response_model=dict)
async def list_properties(
    limit: int = Query(10),
    offset: int = Query(0),
    property_name: Optional[str] = None,
    owner_contact: Optional[str] = None,
    tenant_contact: Optional[str] = None,
    district: Optional[str] = None,
    property_type: Optional[str] = None,
    status: Optional[str] = None,
    created_by: Optional[str] = None,
    exclude_property_names: Optional[List[str]] = Query(None)
):
    """
    부동산 정보 목록 조회
    """
    try:
        logger.info(
            f"Listing properties with parameters: limit={limit}, offset={offset}, "
            f"property_name={property_name}, owner_contact={owner_contact}, tenant_contact={tenant_contact}, "
            f"district={district}, property_type={property_type}, created_by={created_by}, exclude_property_names={exclude_property_names}"
        )

        query = {}
        if property_name:
            if property_name == '기타':
                # 제외할 property_names 목록이 있는 경우
                if exclude_property_names:
                    logger.info(f"Excluding property names: {exclude_property_names}")
                    regex_pattern = '|'.join(exclude_property_names)  # OR 조건으로 정규표현식 생성
                    query["property_info.property_name"] = {
                        "$not": {
                            "$regex": regex_pattern,
                            "$options": "i"  # 대소문자 구분 없이
                        }
                    }
                    logger.info(f"Excluding property names with regex: {regex_pattern}")  # 로그 추가
            else:
                query["property_info.property_name"] = {"$regex": property_name, "$options": "i"}
        if owner_contact:
            query["property_info.owner_info.owner_contact"] = {"$regex": owner_contact, "$options": "i"}
        if tenant_contact:
            query["property_info.tenant_info.tenant_contact"] = {"$regex": tenant_contact, "$options": "i"}
        if district:
            query["property_info.district"] = {"$regex": district, "$options": "i"}
        if property_type:
            query["property_info.property_type"] = {"$regex": property_type, "$options": "i"}
        if status:
            query["status"] = {"$regex": status, "$options": "i"}
        if created_by:
            query["created_by"] = created_by

        total_count = await work_db.properties.count_documents(query)

        properties = []
        cursor = work_db.properties.find(query).sort("created_at", -1).skip(offset).limit(limit)
        async for doc in cursor:
            prop_model = Property.model_validate(doc)
            properties.append(prop_model)

        logger.info(f"Retrieved {len(properties)} properties out of {total_count} total.")

        return jsonable_encoder({
            "results": properties,
            "totalCount": total_count
        })

    except Exception as e:
        logger.exception("List properties error:")
        raise HTTPException(status_code=500, detail="내부 서버 오류가 발생했습니다.")


@app.post("/properties/", response_model=PropertyUpdate)
async def create_property(property: PropertyUpdate):
    """
    부동산 정보 생성
    """
    try:
        logger.info(f"Creating property with data: {property}")
        property_data = property.model_dump()

        # 고유 식별자 생성
        property_data["property_id"] = str(uuid.uuid4())

        # 한국 시간대 설정 및 created_at 설정
        KST = timezone(timedelta(hours=9))
        try:
            property_data["created_at"] = datetime.now(KST)
            logger.info(f"Setting created_at to: {property_data['created_at']}")
        except Exception as e:
            logger.error(f"Error setting created_at: {e}")
            property_data["created_at"] = None
        
        # created_by 필드가 없는 경우 기본값 설정
        if "created_by" not in property_data or not property_data["created_by"]:
            property_data["created_by"] = "system"  # 기본값으로 "system" 설정
            
        result = await work_db.properties.insert_one(property_data)
        created_property_doc = await work_db.properties.find_one({"property_id": property_data["property_id"]})
        logger.info(f"Created Property: {created_property_doc}")

        if not created_property_doc:
            raise HTTPException(status_code=500, detail="생성된 문서를 찾을 수 없습니다.")

        # job_ids 추출 및 관련 call 문서 업데이트 (job_ids가 배열임)
        job_ids = property_data.get("job_ids")
        if job_ids:
            update_result = await work_db.calls.update_many(
                {"job_id": {"$in": job_ids}},
                {"$set": {"property_id": property_data["property_id"]}}
            )
            logger.info(f"Updated {update_result.modified_count} call(s) with property_id {property_data['property_id']} for job_ids {job_ids}")

        # PropertyUpdate로 변환 (ObjectId 직렬화 방지)
        return PropertyUpdate.model_validate(created_property_doc)

    except Exception as e:
        logger.exception("Create property error:")
        raise HTTPException(status_code=500, detail="내부 서버 오류가 발생했습니다.")


@app.get("/properties/{property_id}", response_model=Property)
async def read_property(property_id: str, created_by: Optional[str] = None):
    """
    단일 부동산 정보 조회
    """
    try:
        logger.info(f"Reading property with property_id: {property_id}, created_by: {created_by}")
        query = {"property_id": property_id}
        if created_by:
            query["created_by"] = created_by
            
        doc = await work_db.properties.find_one(query)
        if doc is None:
            logger.warning(f"Property not found: {property_id}")
            raise HTTPException(status_code=404, detail="Property not found")

        prop_model = Property.model_validate(doc)
        logger.info(f"Read Property: {prop_model}")
        return prop_model

    except Exception as e:
        logger.exception(f"Read property error for property_id {property_id}:")
        raise HTTPException(status_code=500, detail="내부 서버 오류가 발생했습니다.")


@app.put("/properties/{property_id}", response_model=Property)
async def update_property(property_id: str, property_update: PropertyUpdate, created_by: Optional[str] = None):
    """
    부동산 정보 업데이트
    """
    try:
        logger.info(f"Updating property with property_id: {property_id} and data: {property_update}")
        
        # 먼저 해당 property가 존재하고 사용자가 소유자인지 확인
        query = {"property_id": property_id}
        if created_by:
            query["created_by"] = created_by
            
        existing_property = await work_db.properties.find_one(query)
        if not existing_property:
            raise HTTPException(status_code=404, detail="Property not found or you don't have permission to update it")
            
        # 업데이트할 데이터 생성 (이미 존재하는 created_at 필드는 제외)
        update_data = property_update.model_dump(exclude_unset=True)
        if "created_at" in update_data:
            update_data.pop("created_at")
        
        result = await work_db.properties.update_one(
            {"property_id": property_id, "created_by": created_by} if created_by else {"property_id": property_id},
            {"$set": update_data}
        )

        if result.modified_count == 0 and result.matched_count == 0:
            logger.warning(f"Property not found for update: {property_id}")
            raise HTTPException(status_code=404, detail="Property not found")

        updated_property_doc = await work_db.properties.find_one({"property_id": property_id})
        logger.info(f"Updated Property: {updated_property_doc}")

        if not updated_property_doc:
            raise HTTPException(status_code=404, detail="Property not found after update.")

        updated_prop_model = Property.model_validate(updated_property_doc)
        return updated_prop_model

    except HTTPException as he:
        raise he
    except Exception as e:
        logger.exception(f"Update property error for property_id {property_id}: {e}")
        raise HTTPException(status_code=500, detail="내부 서버 오류가 발생했습니다.")


@app.delete("/properties/{property_id}")
async def delete_property(property_id: str, created_by: Optional[str] = None):
    """
    부동산 정보 삭제
    - property 삭제 시, 해당 property 문서의 job_id(있을 경우)를 이용하여
      calls 컬렉션에서 해당 property_id와 일치하는 call 문서의 property_id 필드를 제거합니다.
    """
    try:
        logger.info(f"Deleting property with property_id: {property_id}, created_by: {created_by}")
        
        query = {"property_id": property_id}
        if created_by:
            query["created_by"] = created_by
            
        # 삭제할 property 문서 조회
        existing_property = await work_db.properties.find_one(query)
        if not existing_property:
            raise HTTPException(
                status_code=404, 
                detail="Property not found or you don't have permission to delete it"
            )
            
        # property 문서에 저장된 job_id(있다면) 가져오기
        property_job_id = existing_property.get("job_id")
        
        # property와 연관된 call 문서 업데이트
        # property 문서의 job_id가 있다면, 조건에 job_id도 포함하여 업데이트합니다.
        if property_job_id:
            update_result = await work_db.calls.update_many(
                {"job_id": property_job_id, "property_id": property_id},
                {"$unset": {"property_id": ""}}
            )
            logger.info(
                f"Updated {update_result.modified_count} call(s): removed property_id {property_id} "
                f"using job_id {property_job_id}."
            )
        else:
            # job_id 정보가 없으면 property_id만 조건으로 업데이트
            update_result = await work_db.calls.update_many(
                {"property_id": property_id},
                {"$unset": {"property_id": ""}}
            )
            logger.info(
                f"Updated {update_result.modified_count} call(s): removed property_id {property_id}."
            )
        
        # property 문서 삭제
        result = await work_db.properties.delete_one(query)
        if result.deleted_count == 0:
            logger.warning(f"Property not found for deletion: {property_id}")
            raise HTTPException(status_code=404, detail="Property not found")
            
        logger.info(f"Deleted Property: {property_id}")
        return {"detail": "Property deleted"}
    
    except Exception as e:
        logger.exception(f"Delete property error for property_id {property_id}: {e}")
        raise HTTPException(status_code=500, detail="내부 서버 오류가 발생했습니다.")

