const inputs = document.querySelectorAll('.otp-input input');
const timerDisplay = document.getElementById('timer');
const resendLink = document.querySelector('.resend-link');
const emailSpan = document.getElementById('email');
let timeLeft = 120; // 2 minutes in seconds



// Simulating an email for demonstration
emailSpan.textContent = "user@example.com";

// function startTimer() {
//     timerId = setInterval(() => {
//         if (timeLeft <= 0) {
//             clearInterval(timerId);
//             timerDisplay.textContent = "Code expired";
//             timerDisplay.classList.add('expired');
//             inputs.forEach(input => input.disabled = true);
//             canResend = false;
//         } else {
//             const minutes = Math.floor(timeLeft / 60);
//             const seconds = timeLeft % 60;
//             timerDisplay.textContent = `(${minutes}:${seconds.toString().padStart(2, '0')})`;
//             timeLeft--;
//         }
//     }, 1000);
// }

// function resendOTP() {
//     if (canResend) {
//         alert("New OTP sent!");
//         timeLeft = 120;
//         inputs.forEach(input => {
//             input.value = '';
//             input.disabled = false;
//         });
//         inputs[0].focus();
//         clearInterval(timerId);
//         timerDisplay.classList.remove('expired');
//         startTimer();
//     } else {
//         alert("Cannot resend code. Time has expired.");
//     }
// }

inputs.forEach((input, index) => {
    input.addEventListener('input', (e) => {
        if (e.target.value.length > 1) {
            e.target.value = e.target.value.slice(0, 1);
        }
        if (e.target.value.length === 1) {
            if (index < inputs.length - 1) {
                inputs[index + 1].focus();
            }
        }
    });

    input.addEventListener('keydown', (e) => {
        if (e.key === 'Backspace' && !e.target.value) {
            if (index > 0) {
                inputs[index - 1].focus();
            }
        }
        if (e.key === 'e') {
            e.preventDefault();
        }
    });
});

function verifyOTP() {
    const otp = Array.from(inputs).map(input => input.value).join('');
    if (otp.length === 4) {
        if (timeLeft > 0) {
            alert(`Verifying OTP: ${otp}`);
        } else {
            alert('OTP has expired. Please request a new one.');
        }
    } else {
        alert('Please enter a 4-digit OTP');
    }
}

// startTimer();