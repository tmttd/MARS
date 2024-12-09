db = db.getSiblingDB('call_data_db');

const names = ["김철수", "이영희", "박민수", "최지우", "정다은"];
const genders = ["남", "여"];
const propertyTypes = ["아파트", "오피스텔", "상가"];
const cities = ["서울시", "부산시", "대구시"];
const districts = ["강남구", "서초구", "송파구"];
const neighborhoods = ["역삼동", "서초동", "잠실동"];
const complexNames = ["래미안아파트", "서초스타타워", "잠실리센츠"];
const loanStatuses = ["가능", "불가"];
const callSummaries = ["매매 문의", "전세 문의", "대출 가능 여부 확인"];
const memos = ["신축 아파트 선호", "주차 2대 가능 필수", "역세권"];

function getRandomItem(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function getRandomDate() {
  const start = new Date(2024, 0, 1);
  const end = new Date(2024, 11, 31);
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

const testData = Array.from({ length: 10 }, (_, i) => ({
  "job_id": `call${i + 1}`,
  "created_at": new Date(),
  "summarization": {
    "extraction": {
      "call_number": i + 1,
      "call_datetime": getRandomDate().toISOString().slice(0, 19).replace('T', ' '),
      "name": getRandomItem(names),
      "gender": getRandomItem(genders),
      "contact": `010-${Math.floor(1000 + Math.random() * 9000)}-${Math.floor(1000 + Math.random() * 9000)}`,
      "property_type": getRandomItem(propertyTypes),
      "city": getRandomItem(cities),
      "district": getRandomItem(districts),
      "neighborhood": getRandomItem(neighborhoods),
      "complex_name": getRandomItem(complexNames),
      "building": `${Math.floor(1 + Math.random() * 20)}동`,
      "unit": `${Math.floor(101 + Math.random() * 900)}호`,
      "price": Math.floor(50000 + Math.random() * 150000),
      "loan_status": getRandomItem(loanStatuses),
      "move_in_date": getRandomDate().toISOString().slice(0, 10),
      "call_summary": getRandomItem(callSummaries),
      "memo": getRandomItem(memos)
    }
  }
}));

db.calls.insertMany(testData); 