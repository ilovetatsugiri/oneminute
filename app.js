// ===================================
// DOM 요소 및 상수 설정
// ===================================
const inputChar = document.getElementById('inputChar');
const submitBtn = document.getElementById('submitBtn');
const textOutput = document.getElementById('textOutput');
const timerDisplay = document.getElementById('timer');

// Firebase 데이터베이스 경로 설정
const textRef = database.ref('cooperativeText'); // 전체 텍스트 저장 경로
const lastSubmitRef = database.ref('lastSubmissionTime'); // 마지막 입력 시간 저장 경로

// 시간 제한 상수 (밀리초 단위: 60초)
const SUBMISSION_INTERVAL = 60000; 

let lastSubmissionTime = 0; // 마지막 입력 시간 추적 변수

// ===================================
// A. 실시간 텍스트 출력 기능 (Firebase -> UI)
// ===================================

textRef.on('value', (snapshot) => {
    // Firebase에서 전체 텍스트 데이터 가져오기
    const textData = snapshot.val();
    let fullText = '';
    
    // 데이터가 저장된 순서대로 값을 합쳐 하나의 문자열로 만듭니다.
    if (textData) {
        fullText = Object.values(textData).join('');
    }
    
    textOutput.textContent = fullText; // 화면에 출력
    
    // 텍스트가 길어질 경우 스크롤을 맨 아래로 자동 이동
    textOutput.scrollTop = textOutput.scrollHeight;
});

// ===================================
// B. 시간 제한 로직 (UI -> Firebase)
// ===================================

// 마지막 제출 시간 추적 및 버튼 상태 업데이트
lastSubmitRef.on('value', (snapshot) => {
    const serverTime = snapshot.val();
    if (serverTime) {
        lastSubmissionTime = serverTime;
    }
    updateButtonAndTimer();
});

// 입력 버튼 클릭 이벤트
submitBtn.addEventListener('click', () => {
    const char = inputChar.value.trim();
    
    // 1. 유효성 및 시간 제한 검사
    if (char.length !== 1) {
        alert("정확히 한 글자만 입력해 주세요.");
        inputChar.value = '';
        return;
    }
    
    if (submitBtn.disabled) {
        // 이중 체크: 만약 버튼이 비활성화된 상태라면 입력 방지
        return;
    }

    // 2. Firebase에 글자와 현재 시간 기록
    const currentTime = Date.now();

    // 글자를 텍스트 경로에 추가 (push를 사용하여 고유 키를 부여, 순서 보장)
    textRef.push(char)
        .then(() => {
            // 마지막 제출 시간을 업데이트합니다.
            return lastSubmitRef.set(currentTime);
        })
        .then(() => {
            inputChar.value = ''; // 입력창 비우기
            updateButtonAndTimer(); // 버튼 상태 즉시 업데이트
        })
        .catch(error => {
            console.error("데이터 전송 중 오류 발생:", error);
            alert("입력에 실패했습니다. 네트워크를 확인해주세요.");
        });
});

// ===================================
// C. 타이머 및 버튼 상태 업데이트 함수
// ===================================

function updateButtonAndTimer() {
    // 현재 시간과 마지막 제출 시간을 비교하여 남은 시간을 계산
    const now = Date.now();
    const elapsedTime = now - lastSubmissionTime;
    const timeLeft = SUBMISSION_INTERVAL - elapsedTime;

    if (timeLeft <= 0) {
        // 1분이 지났다면 입력 허용
        submitBtn.disabled = false;
        timerDisplay.textContent = "✅ 입력 가능합니다!";
    } else {
        // 1분이 지나지 않았다면 대기
        submitBtn.disabled = true;
        // 남은 시간을 초 단위로 반올림하여 표시
        const secondsLeft = Math.ceil(timeLeft / 1000);
        timerDisplay.textContent = `⏳ 다음 입력까지 ${secondsLeft}초 남았습니다...`;
    }
}

// 1초마다 타이머와 버튼 상태를 주기적으로 업데이트
setInterval(updateButtonAndTimer, 1000);

// 초기 설정
submitBtn.disabled = true; // 시작 시에는 1분 대기부터 시작할 수 있도록 비활성화