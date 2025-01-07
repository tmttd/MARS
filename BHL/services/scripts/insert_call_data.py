from pymongo import MongoClient
from datetime import datetime, timezone

# MongoDB 연결 설정
MONGODB_URI = "mongodb://call-db:27017/"
DATABASE_NAME = "call_data_db"
COLLECTION_NAME = "calls"


def insert_test_call_data():
    try:
        client = MongoClient(MONGODB_URI)
        db = client[DATABASE_NAME]
        collection = db[COLLECTION_NAME]

        # 테스트 데이터
        test_data = [
            {
                "job_id": "call1",
                "created_at": datetime.now(timezone.utc),
                "summarization": {
                    "extraction": {
                        "call_number": 1,
                        "call_datetime": "2024-03-15 14:30:00",
                        "name": "김철수",
                        "gender": "남",
                        "contact": "010-1234-5678",
                        "property_type": "아파트",
                        "city": "서울시",
                        "district": "강남구",
                        "neighborhood": "역삼동",
                        "complex_name": "래미안아파트",
                        "building": "101동",
                        "unit": "1502호",
                        "price": 150000,
                        "loan_status": "가능",
                        "move_in_date": "2024-06-30",
                        "call_summary": "매매 문의, 대출 가능 여부 확인",
                        "memo": "신축 아파트 선호",
                    },
                    "file_name": "테스트2.m4a"
                },
            },
            {
                "job_id": "call2",
                "created_at": datetime.now(timezone.utc),
                "summarization": {
                    "extraction": {
                        "call_number": 2,
                        "call_datetime": "2024-03-15 15:45:00",
                        "name": "이영희",
                        "gender": "여",
                        "contact": "010-9876-5432",
                        "property_type": "오피스텔",
                        "city": "서울시",
                        "district": "서초구",
                        "neighborhood": "서초동",
                        "complex_name": "서초스타타워",
                        "building": "A동",
                        "unit": "805호",
                        "price": 85000,
                        "loan_status": "불가",
                        "move_in_date": "2024-04-15",
                        "call_summary": "전세 문의, 즉시 입주 희망",
                        "memo": "주차 2대 가능 필수",
                    },
                    "file_name": "테스트2.m4a"
                },
            },
        ]

        # 기존 데이터 삭제 (선택사항)
        collection.delete_many({})

        # 새 데이터 삽입
        result = collection.insert_many(test_data)
        print(
            f"성공적으로 {len(result.inserted_ids)}개의 테스트 데이터가 삽입되었습니다."
        )

    except Exception as e:
        print(f"데이터 삽입 중 오류 발생: {str(e)}")
    finally:
        client.close()


if __name__ == "__main__":
    insert_test_call_data()
