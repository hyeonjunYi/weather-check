# 계룡시 기상 업무 브리핑

## 기존 저장소에 반영

ZIP을 풀고 안의 `public`, `scripts`, `.github`, `README.md`를 저장소 루트에 넣습니다.
ZIP 자체를 올리지 마세요. 기존 `public` 파일은 덮어쓰고, 이 사이트에 쓰던
`netlify.toml`과 `netlify/`는 GitHub Pages 전환 후 정리할 수 있습니다.

1. GitHub 저장소 **Settings → Pages → Build and deployment → Source**를 **GitHub Actions**로 설정합니다.
2. 파일을 `main` 브랜치에 커밋합니다. 웹 업로드에서 숨김 폴더가 빠졌다면,
   **Add file → Create new file**에서 이름을 `.github/workflows/weather-pages.yml`로
   지정하고 ZIP 안의 같은 파일 내용을 붙여넣습니다.
3. **Actions → 날씨 자료 수집 및 Pages 배포 → Run workflow → main**을 실행합니다.
   Actions가 비활성화되어 있으면 저장소에서 먼저 활성화합니다.
4. 실행이 성공하면 **Settings → Pages**에 표시된 주소로 접속합니다.

GitHub Pages를 사용할 수 있는 저장소 설정이 필요합니다. 공개 저장소라면 코드와
사이트가 모두 공개되므로 내부 자료와 비밀 키를 넣지 마세요. 기본 워크플로는
GitHub가 제공하는 권한을 사용합니다.

## 자료 갱신

- 매시간 17분(KST와 UTC의 분 값 동일), main에 변경사항을 올릴 때, 또는 수동 실행 시
  날씨·기상특보·산불위기경보·보령 지점 조석을 수집합니다.
- 새로고침 버튼은 최근 배포된 자료를 읽습니다. 즉시 원본을 수집하려면 Actions에서 실행합니다.
- 예약 실행은 지연될 수 있습니다. 2시간 넘은 게시 자료와 조회 실패는 미확인으로 표시됩니다.
  특보 발효 여부와 조석은 화면의 공식 원문에서 확인할 수 있습니다.
- 상단 큰 제목은 `public/index.html`의 `<h1>`, 브라우저 탭 제목은 `<title>`입니다.
