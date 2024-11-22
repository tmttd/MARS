from flask import Flask, request, send_file, jsonify
import os
import ffmpeg
import io

app = Flask(__name__)

# 임시 디렉토리 생성
UPLOAD_FOLDER = '/app/temp'
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

@app.route('/convert', methods=['POST'])
def convert():
    input_filename = None
    output_filename = None
    
    try:
        if 'file' not in request.files:
            return jsonify({'error': '파일이 없습니다'}), 400

        file = request.files['file']
        if file.filename == '':
            return jsonify({'error': '선택된 파일이 없습니다'}), 400

        # 원본 파일명 사용
        input_filename = os.path.join(UPLOAD_FOLDER, file.filename)
        # 출력 파일명은 원본 파일명에서 확장자만 .wav로 변경
        output_filename = os.path.join(UPLOAD_FOLDER, os.path.splitext(file.filename)[0] + '.wav')
        
        # 파일 저장
        print(f"파일 저장 위치: {input_filename}")
        file.save(input_filename)
        print(f"파일 저장 완료: {input_filename}")

        # ffmpeg 변환
        print("ffmpeg 변환 시작")
        stream = ffmpeg.input(input_filename)
        stream = ffmpeg.output(stream, output_filename, acodec='pcm_s16le', ac=1, ar=44100)
        ffmpeg.run(stream, overwrite_output=True)
        print(f"변환 완료, 출력 파일: {output_filename}")

        # 파일 읽기
        print("변환된 파일 읽기")
        with open(output_filename, 'rb') as f:
            audio_data = f.read()

        # 파일 전송
        print("파일 전송")
        return send_file(
            io.BytesIO(audio_data),
            mimetype='audio/wav',
            download_name=os.path.splitext(file.filename)[0] + '.wav'
        )

    except Exception as e:
        print(f"오류 발생: {str(e)}")
        import traceback
        print(traceback.format_exc())
        return jsonify({'error': str(e)}), 500

    finally:
        # 임시 파일 정리
        try:
            if input_filename and os.path.exists(input_filename):
                os.remove(input_filename)
                print(f"입력 파일 정리 완료: {input_filename}")
            if output_filename and os.path.exists(output_filename):
                os.remove(output_filename)
                print(f"출력 파일 정리 완료: {output_filename}")
        except Exception as e:
            print(f"파일 정리 중 오류 발생: {str(e)}")

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)