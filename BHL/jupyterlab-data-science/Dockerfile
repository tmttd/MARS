FROM jupyter/datascience-notebook

# 작업 디렉토리 설정
WORKDIR /home/jovyan/work

# 의존성 설치
COPY requirements.txt ./
RUN pip install -r requirements.txt

# JupyterLab 확장 설치 (옵션)
# RUN jupyter labextension install @jupyterlab/toc

# 포트 노출
EXPOSE 8888