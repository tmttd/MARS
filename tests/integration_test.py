import requests
import time
import os
from pathlib import Path

class MARSIntegrationTest:
    def __init__(self):
        self.converter_url = "http://localhost:8000"
        self.transcription_url = "http://localhost:8001"
        self.summarization_url = "http://localhost:8002"
        
    def test_full_pipeline(self, audio_file_path: str):
        """전체 파이프라인 테스트: 오디오 변환 -> 텍스트 변환 -> 요약"""
        print("=== 전체 파이프라인 테스트 시작 ===")
        total_start_time = time.time()
        
        try:
            # 1. 오디오 파일 변환
            print("\n1. 오디오 변환 테스트")
            convert_start_time = time.time()
            with open(audio_file_path, 'rb') as audio:
                files = {'file': audio}
                response = requests.post(f"{self.converter_url}/convert", files=files)
                assert response.status_code == 200
                converter_job_id = response.json()['job_id']
                print(f"변환 작업 ID: {converter_job_id}")
            
            # 변환 완료 대기
            while True:
                response = requests.get(f"{self.converter_url}/convert/{converter_job_id}")
                if response.json()['status'] == 'completed':
                    converted_file = response.json()['output_file']
                    break
                # time.sleep(2)
            convert_time = time.time() - convert_start_time
            print(f"오디오 변환 소요 시간: {convert_time:.2f}초")
            
            # 2. 음성-텍스트 변환
            print("\n2. 음성-텍스트 변환 테스트")
            transcribe_start_time = time.time()
            with open(converted_file, 'rb') as audio:
                files = {'file': audio}
                response = requests.post(f"{self.transcription_url}/transcribe", files=files)
                assert response.status_code == 200
                transcription_job_id = response.json()['job_id']
                print(f"변환 작업 ID: {transcription_job_id}")
            
            # 변환 완료 대기
            while True:
                response = requests.get(f"{self.transcription_url}/transcript/{transcription_job_id}")
                if response.json()['status'] == 'completed':
                    transcribed_text = response.json()['text']
                    break
                # time.sleep(2)
            transcribe_time = time.time() - transcribe_start_time
            print(f"음성-텍스트 변환 소요 시간: {transcribe_time:.2f}초")
            
            # 3. 텍스트 요약
            print("\n3. 텍스트 요약 테스트")
            summarize_start_time = time.time()
            response = requests.post(
                f"{self.summarization_url}/summarize",
                json={"text": transcribed_text}
            )
            assert response.status_code == 200
            summary = response.json()['summary']
            summarize_time = time.time() - summarize_start_time
            print(f"텍스트 요약 소요 시간: {summarize_time:.2f}초")
            
            total_time = time.time() - total_start_time
            print("\n=== 테스트 결과 ===")
            print(f"전체 소요 시간: {total_time:.2f}초")
            print(f"- 오디오 변환: {convert_time:.2f}초")
            print(f"- 음성-텍스트 변환: {transcribe_time:.2f}초")
            print(f"- 텍스트 요약: {summarize_time:.2f}초")
            print(f"원본 텍스트: {transcribed_text}")
            print(f"요약 결과: {summary}")
            return True
            
        except Exception as e:
            print(f"테스트 실패: {str(e)}")
            return False
            
    def test_health_checks(self):
        """각 서비스의 상태 확인"""
        print("\n=== 서비스 상태 확인 ===")
        services = {
            "Converter": f"{self.converter_url}/health",
            "Transcription": f"{self.transcription_url}/health",
            "Summarization": f"{self.summarization_url}/health"
        }
        
        for service_name, url in services.items():
            try:
                response = requests.get(url)
                print(f"{service_name}: {'정상' if response.status_code == 200 else '오류'}")
            except Exception as e:
                print(f"{service_name}: 연결 실패 - {str(e)}")

if __name__ == "__main__":
    # 테스트 실행
    test = MARSIntegrationTest()
    
    # 상태 확인
    # test.test_health_checks()
    
    # 전체 파이프라인 테스트
    test_file = "test_audio.m4a"  # 테스트용 오디오 파일 경로
    if os.path.exists(test_file):
        test.test_full_pipeline(test_file)
    else:
        print(f"테스트 파일을 찾을 수 없습니다: {test_file}")