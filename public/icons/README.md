# 앱 아이콘 생성 방법

## 필요한 파일
- icon-192x192.png
- icon-512x512.png

## 생성 방법

### 방법 1: 온라인 변환 (권장)
1. https://cloudconvert.com/svg-to-png 접속
2. icon.svg 업로드
3. 크기를 192x192 또는 512x512로 설정
4. 변환 후 다운로드
5. 이 폴더에 저장

### 방법 2: Figma
1. Figma에서 icon.svg 열기
2. 192x192, 512x512 프레임으로 내보내기

### 방법 3: 명령어 (ImageMagick 설치 필요)
```bash
convert icon.svg -resize 192x192 icon-192x192.png
convert icon.svg -resize 512x512 icon-512x512.png
```

## 임시 해결책
PNG 파일이 없어도 앱은 작동합니다. 다만 홈 화면 아이콘이 기본 아이콘으로 표시됩니다.
