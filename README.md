# FrameScript
영상에서 대사 영역과 선택한 이름 영역을 지정해 브라우저에서 텍스트를 추출합니다. 시작·종료 시간과 검사 간격을 조절할 수 있습니다.

## GitHub Pages
이 폴더 안의 파일을 저장소 최상위에 올린 뒤 Settings → Pages → Deploy from a branch → main → /(root)를 선택합니다.

## 데이터와 라이선스
영상과 결과는 브라우저에서 처리합니다. OCR 엔진과 언어 파일은 인터넷에서 내려받으므로 최초 실행에 네트워크 연결이 필요합니다.
OCR 엔진은 [Tesseract.js 5.1.1](https://github.com/naptha/tesseract.js/tree/v5.1.1)이며 Apache License 2.0을 사용합니다.
영역을 지정하는 방식은 [MORT](https://github.com/kmonkeyhead/MORT)를 참고했습니다. MORT 코드나 이미지는 포함하지 않았습니다. 각 프로젝트의 라이선스 원문은 저장소 최상위의 MORT.txt와 Tesseract.js.txt에 있습니다.
