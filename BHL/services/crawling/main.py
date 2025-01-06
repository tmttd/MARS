from pymongo import MongoClient
from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait, Select
from selenium.webdriver.support import expected_conditions as EC
from datetime import datetime, timezone
from bs4 import BeautifulSoup
from config import settings
import time
import json
import os
import logging

def crawl_complex_names(property_type_value: str):
    """
    주거 유형별 단지명을 크롤링하는 함수
    Args:
        property_type_value (str): 'AT'(아파트) 또는 'OP'(오피스텔)
    """
    # 주거 유형 선택
    property_type = driver.find_element(By.XPATH, '//*[@id="offerings_gbn"]')
    property_type_select = Select(property_type)
    property_type_select.select_by_value(property_type_value)
    time.sleep(1)

    # 서울 선택
    Cities = driver.find_element(By.XPATH, '//*[@id="metro_cd"]')
    Cities_select = Select(Cities)
    Cities_select.select_by_value('1100000000')
    time.sleep(1)

    # 구-동-단지 순회
    Gus = driver.find_element(By.XPATH, '//*[@id="gu_cd"]')
    Gus_select = Select(Gus)

    collection_name = f"seoul_{property_type_value}"  # 주거 유형별 collection

    # 구 순회
    for gu_option in Gus_select.options[1:]:
        gu_value = gu_option.get_attribute('value')
        gu_name = gu_option.text
        Gus_select.select_by_value(gu_value)
        time.sleep(1)
        
        # 각 구별 데이터 초기화
        gu_data = {
            '_id': gu_value,
            'name': gu_name,
            'created_at': datetime.now(),
            'updated_at': datetime.now(),
            'dongs': {}
        }
        
        # 동 순회
        Dongs = driver.find_element(By.XPATH, '//*[@id="dong_cd"]')
        Dongs_select = Select(Dongs)
        
        for dong_option in Dongs_select.options[1:]:
            dong_value = dong_option.get_attribute('value')
            dong_name = dong_option.text
            Dongs_select.select_by_value(dong_value)
            time.sleep(1)
            
            # 단지명 가져오기
            Danjis = driver.find_element(By.XPATH, '//*[@id="complex_cd"]')
            Danjis_select = Select(Danjis)
            all_Danjis_options = [option.text for option in Danjis_select.options][1:]
            
            # 동별 단지 데이터 저장
            gu_data['dongs'][dong_name] = all_Danjis_options
            
            print(f"크롤링 완료: {gu_name} {dong_name} - {len(all_Danjis_options)}개 단지")

        try:
            # 주거 유형별 collection에 저장
            vocab_db[collection_name].update_one(
                {"_id": gu_value},
                {"$set": gu_data},
                upsert=True
            )
            print(f"{gu_name} 데이터 저장 완료 (collection: {collection_name})")
        except Exception as e:
            logger.error(f"데이터 저장 실패: {str(e)}")
            print(f"데이터 저장 실패: {str(e)}")
            raise

UTC = timezone.utc

# 로깅 설정
logging.basicConfig(level=logging.WARNING)
logger = logging.getLogger(__name__)

# 환경 변수
MONGODB_URI = os.getenv("MONGODB_URI", "mongodb://localhost:27017/")
MONGODB_DB = os.getenv("MONGODB_DB", "converter_db")

try:
    client = MongoClient(MONGODB_URI)
    db = client[MONGODB_DB]
    work_client = MongoClient(settings.WORK_MONGODB_URI)
    work_db = work_client[settings.WORK_MONGODB_DB]
    vocab_db = work_client[settings.VOCAB_MONGODB_DB]
    logger.info("MongoDB 연결 성공")
    print("MongoDB 연결 성공")
except Exception as e:
    logger.error(f"MongoDB 연결 실패: {str(e)}")
    raise

# ChromeDriver 설정
chrome_options = Options()
service = Service('/opt/homebrew/bin/chromedriver')  # 실제 ChromeDriver 경로 지정
driver = webdriver.Chrome(service=service, options=chrome_options)
wait = WebDriverWait(driver, 10)

# 부동산 뱅크 로그인 페이지 이동
driver.get('https://www.neonet.co.kr/novo-rebank/view/member/MemberLogin.neo?login_check=yes&return_url=/novo-rebank/index.neo')

# 로그인
id_input = driver.find_element(By.XPATH, '//*[@id="input_id"]')
id_input.send_keys('5164980')
pwd_input = driver.find_element(By.XPATH, '//*[@id="input_pw"]')
pwd_input.send_keys('5164980')
button = driver.find_element(By.XPATH, '/html/body/div[2]/div[2]/div[1]/dl/dt/form/table[1]/tbody/tr[1]/td[2]/input')
button.click()
time.sleep(2)
driver.switch_to.window(driver.window_handles[-1])

# 매물 등록 페이지로 이동
button_2 = driver.find_element(By.XPATH, '//*[@id="btn_offer_register"]/span/a')
button_2.click()
time.sleep(5)

crawl_complex_names('AT')  # 아파트 정보 크롤링
crawl_complex_names('OP')  # 오피스텔 정보 크롤링

time.sleep(5)
driver.quit()