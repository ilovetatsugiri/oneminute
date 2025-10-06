// ===================================
// DOM 요소 및 상수 설정
// ===================================
const inputChar = document.getElementById('inputChar');
const submitBtn = document.getElementById('submitBtn');
const textOutput = document.getElementById('textOutput');
const timerDisplay = document.getElementById('timer');

// Firebase 데이터베이스 경로 설정
// 이 경로에 데이터가 저장됩니다.
const textRef = database.ref('cooperativeText'); 
const lastSubmitRef = database.ref('lastSubmissionTime'); 

// 시간 제한 상수 (밀리초 단위: 60초)
const SUBMISSION_INTERVAL = 60000; 
let lastSubmissionTime = 0; 

// ===================================
// A. 실시간 텍스트 출력 기능 (Firebase -> UI)
// ===================================

// 'cooperativeText' 경로의 데이터가 변경될 때마다 실행됩니다.
textRef.on('value', (snapshot) => {
    // console.log("Firebase 텍스트 데이터 변경 감지!"); // 디버깅용
    const textData = snapshot.val();
    let fullText = '';
    
    if (textData) {
        // Firebase의 객체 데이터를 순서대로 배열로 변환 후, join으로 하나의 문자열로 합칩니다.
        fullText = Object.values(textData).join('');
    }
    
    // 화면에 텍스트 업데이트
    textOutput.textContent = fullText; 
    
    // 텍스트가 길어질 경우 스크롤을 맨 아래로 자동 이동
    textOutput.scrollTop = textOutput.scrollHeight;
});

// ===================================
// B. 시간 제한 및 입력 로직
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
    
    // 유효성 검사
    if (char.length !== 1) {
        alert("정확히 한 글자만 입력해 주세요.");
        inputChar.value = '';
        return;
    }
    
    if (submitBtn.disabled) {
        return;
    }

    // 데이터 저장
    const currentTime = Date.now();

    // 1. 글자를 'cooperativeText'에 저장 (push()는 순서 유지를 위한 고유 ID를 생성합니다.)
    textRef.push(char)
        .then(() => {
            // 2. 'lastSubmissionTime'을 현재 시간으로 업데이트
            return lastSubmitRef.set(currentTime);
        })
        .then(() => {
            inputChar.value = ''; // 입력창 비우기
            updateButtonAndTimer(); // 버튼 상태 즉시 업데이트
        })
        .catch(error => {
            // 오류가 발생하면 사용자에게 알리고 콘솔에 기록
            alert("입력에 실패했습니다. Firebase 연결 또는 규칙을 확인해주세요.");
            console.error("Firebase 데이터 전송 중 오류 발생:", error);
        });
});

// ===================================
// C. 타이머 및 버튼 상태 업데이트 함수
// ===================================

function updateButtonAndTimer() {
    const now = Date.now();
    const elapsedTime = now - lastSubmissionTime;
    const timeLeft = SUBMISSION_INTERVAL - elapsedTime;

    if (timeLeft <= 0) {
        submitBtn.disabled = false;
        timerDisplay.textContent = "✅ 입력 가능합니다!";
    } else {
        submitBtn.disabled = true;
        const secondsLeft = Math.ceil(timeLeft / 1000);
        timerDisplay.textContent = `⏳ 다음 입력까지 ${secondsLeft}초 남았습니다...`;
    }
}

// 1초마다 타이머와 버튼 상태를 주기적으로 업데이트
setInterval(updateButtonAndTimer, 1000);

// 초기 설정
submitBtn.disabled = true;
