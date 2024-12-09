from pymongo import MongoClient
from datetime import datetime, timezone

# MongoDB 연결 설정 (docker-compose.yml 환경변수 참조)
MONGODB_URI = "mongodb://work-db:27017/"
DATABASE_NAME = "mars_work_db"
COLLECTION_NAME = "jobs"


def insert_test_data():
    try:
        client = MongoClient(MONGODB_URI)
        db = client[DATABASE_NAME]
        collection = db[COLLECTION_NAME]

        # # 기존 데이터 삭제
        # deleted = collection.delete_many({})
        # print(f"기존 데이터 {deleted.deleted_count}개 삭제됨")

        # 테스트 데이터
        test_data = [
            {
                "job_id": "test1",
                "created_at": datetime.now(timezone.utc),
                "summarization": {
                    "extraction": {
                        "property_type": "상가",
                        "price": 15000,
                        "address": "서울시 강남구 역삼동 123-45",
                        "building_name": "역삼빌딩",
                        "floor": "3",
                        "dong": "A동",
                        "deposit": 5000,
                        "monthly_rent": 150,
                        "premium": 3000,
                        "business_type": "카페",
                        "owner_name": "홍길동",
                        "owner_contact": "010-1234-5678",
                        "memo": "신축건물",
                    }
                },
            },
            {
                "job_id": "test2",
                "created_at": datetime.now(timezone.utc),
                "summarization": {
                    "extraction": {
                        "property_type": "사무실",
                        "price": 20000,
                        "address": "서울시 서초구 서초동 456-78",
                        "building_name": "서초타워",
                        "floor": "8",
                        "dong": "B동",
                        "deposit": 10000,
                        "monthly_rent": 200,
                        "premium": 5000,
                        "business_type": "사무실",
                        "owner_name": "김철수",
                        "owner_contact": "010-2345-6789",
                        "memo": "역세권",
                    }
                },
            },
        ]

        # 데이터 삽입
        result = collection.insert_many(test_data)
        print(
            f"성공적으로 {len(result.inserted_ids)}개의 테스트 데이터가 삽입되었습니다."
        )

        # 삽입된 데이터 확인
        inserted_data = list(collection.find({}, {"_id": 0}))
        print("\n삽입된 데이터:")
        for doc in inserted_data:
            print(f"job_id: {doc['job_id']}")
            print(f"extraction: {doc['summarization']['extraction']}\n")

    except Exception as e:
        print(f"오류 발생: {str(e)}")
    finally:
        client.close()


if __name__ == "__main__":
    insert_test_data()
