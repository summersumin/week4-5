const video = document.getElementById('webcam');
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const colorPickerButton = document.getElementById('colorPickerButton');
const colorPicker = document.getElementById('colorPicker');
const shapeChangeButton = document.getElementById('shapeChangeButton');
const clearCanvasButton = document.getElementById('clearCanvas');

let handposeModel;
let points = []; // {x, y, color, shape} 정보를 저장할 배열
let isDrawing = true; // 그리기 활성화 상태
let pointColor = 'white'; // 기본 색상
let shapeIndex = 0; // 도형 인덱스: 0 = 정원, 1 = 정삼각형, 2 = 정사각형

// 웹캠 시작 (권한 요청 포함)
async function startWebcam() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        video.srcObject = stream;
    } catch (err) {
        console.error('웹캠 권한을 요청하는 중 오류 발생:', err);
        alert('웹캠 권한이 필요합니다. 권한을 허용해 주세요.');
    }
}

// 웹캠 비디오가 로드될 때까지 기다린 후 모델 로드
video.addEventListener('loadeddata', async () => {
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    try {
        handposeModel = await handpose.load();
        detectHands(); // 비디오가 준비된 후에 손 추적 시작
    } catch (err) {
        console.error('모델 로딩 중 오류가 발생했습니다:', err);
    }
});

// 손을 감지하고 도형을 그리는 함수
async function detectHands() {
    const predictions = await handposeModel.estimateHands(video);

    if (predictions.length > 0) {
        const indexFinger = predictions[0].annotations.indexFinger[3]; // 검지 손가락 끝 좌표
        const palmBase = predictions[0].annotations.palmBase[0]; // 손바닥 중심 좌표

        const distanceFingerToPalm = distance(indexFinger, palmBase);

        // 주먹 상태 확인: 손바닥과 검지 사이의 거리가 짧으면 주먹 상태로 간주
        if (distanceFingerToPalm < 50) {
            isDrawing = false; // 주먹을 쥐었을 때 그리기 중지
        } else {
            isDrawing = true; // 손을 폈을 때 그리기 활성화
        }

        if (isDrawing) {
            // 손가락 끝 좌표와 현재 색상, 모양 정보를 저장
            points.push({
                x: indexFinger[0],
                y: indexFinger[1],
                color: pointColor,
                shape: shapeIndex
            });
        }
    }

    drawShapes(); // 도형 그리기

    requestAnimationFrame(detectHands); // 계속 감지
}

// 도형 그리기
function drawShapes() {
    ctx.clearRect(0, 0, canvas.width, canvas.height); // 캔버스 초기화
    
    points.forEach(point => {
        ctx.fillStyle = point.color; // 저장된 색상 적용
        ctx.beginPath();
        switch (point.shape) {
            case 0: // 정원
                ctx.arc(point.x, point.y, 15, 0, 2 * Math.PI); // 반지름 15px의 정원
                break;
            case 1: // 정삼각형
                const height = 30 * Math.sqrt(3) / 2; // 높이를 계산하여 정삼각형 만들기
                ctx.moveTo(point.x, point.y - height / 2); // 꼭짓점
                ctx.lineTo(point.x - 15, point.y + height / 2); // 왼쪽 아래
                ctx.lineTo(point.x + 15, point.y + height / 2); // 오른쪽 아래
                ctx.closePath();
                break;
            case 2: // 정사각형
                ctx.rect(point.x - 15, point.y - 15, 30, 30); // 중심이 손가락 좌표에 위치하는 정사각형
                break;
        }
        ctx.fill(); // 도형을 채우기
    });
}

// 두 점 사이 거리 계산
function distance(p1, p2) {
    return Math.sqrt(Math.pow(p2[0] - p1[0], 2) + Math.pow(p2[1] - p1[1], 2));
}

// 색상 변경 버튼 클릭 이벤트
colorPickerButton.addEventListener('click', () => {
    colorPicker.click(); // 컬러 피커 열기
});

// 모양 변경 버튼 클릭 이벤트
shapeChangeButton.addEventListener('click', () => {
    shapeIndex = (shapeIndex + 1) % 3; // 0 (정원) -> 1 (정삼각형) -> 2 (정사각형) -> 0 (정원)으로 순환
});

// 컬러 피커에서 색상을 선택할 때 이벤트
colorPicker.addEventListener('input', (event) => {
    pointColor = event.target.value; // 사용자가 선택한 색상으로 변경
});

// 캔버스 클리어 버튼 클릭 이벤트
clearCanvasButton.addEventListener('click', () => {
    points = []; // 점 배열 초기화
    ctx.clearRect(0, 0, canvas.width, canvas.height); // 캔버스 초기화
});

// 페이지 로드 시 웹캠 시작
startWebcam();
