// ===================================
// DOM 요소 및 상수 설정
// ===================================
const inputChar = document.getElementById('inputChar');
const submitBtn = document.getElementById('submitBtn');
const textOutput = document.getElementById('textOutput');
const timerDisplay = document.getElementById('timer');

const adminPassword = document.getElementById('adminPassword');
const loginBtn = document.getElementById('loginBtn');
const adminStatus = document.getElementById('adminStatus');

// Firebase 데이터베이스 경로 설정
const textRef = database.ref('cooperativeText'); 
const lastSubmitRef = database.ref('lastSubmissionTime'); 

const SUBMISSION_INTERVAL = 60000; 
const SECRET_PASSWORD = "tatsugiri"; // 설정하신 암호

let lastSubmissionTime = 0; 
let isAdmin = false; // 관리자 상태
let adminLoginTime = 0; // 관리자 로그인 시간 기록

// ===================================
// A. 관리자 로그인 로직
// ===================================
loginBtn.addEventListener('click', () => {
    if (adminPassword.value === SECRET_PASSWORD) {
        isAdmin = true;
        adminLoginTime = Date.now(); // 로그인 시간 기록
        adminStatus.textContent = "✅ 관리자 권한이 활성화되었습니다.";
        adminPassword.style.display = 'none';
        loginBtn.style.display = 'none';
        
        // **[핵심]** 관리자 로그인 시 게시판을 다시 로드하여 삭제 버튼을 만듭니다.
        loadTextAndListener(); 
    } else {
        isAdmin = false;
        adminStatus.textContent = "❌ 암호가 틀렸습니다. 다시 시도하세요.";
    }
});


// ===================================
// B. 실시간 텍스트 출력 기능 (Firebase -> UI)
// ===================================

function loadTextAndListener() {
    textRef.on('value', (snapshot) => {
        const textData = snapshot.val();
        let textHtml = ''; 
        
        if (textData) {
            const textEntries = Object.entries(textData);
            
            textEntries.forEach(([key, data]) => {
                const char = typeof data === 'object' ? data.char : data; // 객체 또는 문자열 데이터 처리
                const submittedAt = typeof data === 'object' ? data.submittedAt : 0; // 저장된 시간

                // 1. 관리자 삭제 버튼 추가 (isAdmin이 true일 때만)
                let deleteButton = '';
                if (isAdmin) {
                    deleteButton = `<button class="delete-char-btn" data-key="${key}" style="display: block !important;">X</button>`;
                }
                
                // 2. 파란색 반짝임 클래스 추가 (관리자 로그인 시간 이후의 글자에만)
                let charClass = '';
                // ❗ 로그인 후 입력된 글자 AND 저장된 시간이 있다면 클래스 추가
                if (isAdmin && submittedAt > adminLoginTime) { 
                   charClass = 'admin-char';
                }

                textHtml += `<span id="${key}" class="char-unit">${deleteButton}<span class="${charClass}">${char}</span></span>`;
            });
            
            textOutput.innerHTML = textHtml; 
            
            // 삭제 버튼 이벤트 리스너 추가
            if (isAdmin) {
                document.querySelectorAll('.delete-char-btn').forEach(button => {
                    button.addEventListener('click', (e) => {
                        const keyToDelete = e.target.getAttribute('data-key');
                        database.ref('cooperativeText/' + keyToDelete).remove()
                            .catch(error => {
                                console.error("글자 삭제 실패:", error);
                                alert("삭제 권한이 없거나 실패했습니다.");
                            });
                    });
                });
            }
        } else {
            textOutput.textContent = '';
        }

        textOutput.scrollTop = textOutput.scrollHeight;
    });
}

// ===================================
// C. 시간 제한 및 입력 로직 수정
// ===================================
submitBtn.addEventListener('click', () => {
    const char = inputChar.value.trim();
    
    if (char.length !== 1 || submitBtn.disabled) {
        if (char.length !== 1) alert("정확히 한 글자만 입력해 주세요.");
        inputChar.value = '';
        return;
    }

    const currentTime = Date.now();
    
    // ⭐ [수정] 관리자 여부를 데이터에 함께 저장
    const dataToSave = {
        char: char,
        submittedAt: currentTime,
        // isAdmin: isAdmin // 이 정보는 굳이 저장하지 않아도 됩니다. 시간으로 대체 가능.
    };

    textRef.push(dataToSave) // 객체 형태로 저장
        .then(() => {
            return lastSubmitRef.set(currentTime);
        })
        .then(() => {
            inputChar.value = '';
            updateButtonAndTimer();
        })
        .catch(error => {
            alert("입력에 실패했습니다. Firebase 연결 또는 규칙을 확인해주세요.");
        });
});

// ... 기존 updateButtonAndTimer() 함수는 그대로 둡니다. ...
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

// ===================================
// D. 초기 설정
// ===================================
submitBtn.disabled = true; 
loadTextAndListener(); // 텍스트 로드 시작
setInterval(updateButtonAndTimer, 1000); // 타이머 시작
