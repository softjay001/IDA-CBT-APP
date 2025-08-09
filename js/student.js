
// js/student.js
(function() {
    const CbtStudentApp = {
        currentExamData: null,
        studentAnswers: [],
        markedQuestions: [],
        currentQuestionIndex: 0,
        examTimerInterval: null,
        lastExamContext: null,
        DOMElements: {},

        initialize: async function() {
            this.cacheDOMElements();
            this.addEventListeners();
            await LicenseService.initialize();
            this.DOMElements.examEntryView.classList.remove('hidden');
        },

        cacheDOMElements: function() {
            this.DOMElements = {
                examEntryView: document.getElementById('examEntryView'),
                examInterfaceView: document.getElementById('examInterfaceView'),
                resultsView: document.getElementById('resultsView'),
                studentNameInput: document.getElementById('studentName'),
                examPasswordInput: document.getElementById('examPassword'),
                examFileInput: document.getElementById('examFile'),
                startExamBtn: document.getElementById('startExamBtn'),
                displayStudentName: document.getElementById('displayStudentName'),
                examTitle: document.getElementById('examTitle'),
                currentQuestion: document.getElementById('currentQuestion'),
                totalQuestions: document.getElementById('totalQuestions'),
                examTimer: document.getElementById('examTimer'),
                questionImageContainer: document.querySelector('.question-image'),
                questionText: document.querySelector('.question-text h4'),
                questionBody: document.querySelector('.question-text p'),
                questionAnswers: document.getElementById('questionAnswers'),
                prevBtn: document.getElementById('prevBtn'),
                nextBtn: document.getElementById('nextBtn'),
                submitBtn: document.getElementById('submitBtn'),
                markBtn: document.getElementById('markBtn'),
                questionNavigator: document.getElementById('questionNavigator'),
                scoreCircle: document.getElementById('scoreCircle'),
                scorePercentage: document.getElementById('scorePercentage'),
                congratsMessage: document.getElementById('congratsMessage'),
                scoreDetails: document.getElementById('scoreDetails'),
                resultStudentName: document.getElementById('resultStudentName'),
                viewGradeBtn: document.getElementById('viewGradeBtn'),
                backToEntryBtn: document.getElementById('backToEntryBtn'),
                gradeModal: document.getElementById('gradeModal'),
                gradePasswordInput: document.getElementById('gradePasswordModal'),
                gradeDetailsContainer: document.getElementById('gradeDetails'),
                yourScore: document.getElementById('yourScore'),
                classAverage: document.getElementById('classAverage'),
                closeGradeModalBtn: document.getElementById('closeGradeModalBtn'),
                loadGradeDetailsBtn: document.getElementById('loadGradeDetailsBtn'),
            };
        },

        addEventListeners: function() {
            this.DOMElements.startExamBtn.addEventListener('click', () => this.startExam());
            this.DOMElements.prevBtn.addEventListener('click', () => this.previousQuestion());
            this.DOMElements.nextBtn.addEventListener('click', () => this.nextQuestion());
            this.DOMElements.submitBtn.addEventListener('click', () => this.submitExam());
            this.DOMElements.markBtn.addEventListener('click', () => this.toggleMarkQuestion());
            this.DOMElements.viewGradeBtn.addEventListener('click', () => this.viewGrade());
            this.DOMElements.backToEntryBtn.addEventListener('click', () => this.backToEntry());
            this.DOMElements.closeGradeModalBtn.addEventListener('click', () => this.closeGradeModal());
            this.DOMElements.loadGradeDetailsBtn.addEventListener('click', () => this.loadGradeDetails());
        },

        startExam: async function() {
            const studentName = this.DOMElements.studentNameInput.value.trim();
            const password = this.DOMElements.examPasswordInput.value;
            const fileInput = this.DOMElements.examFileInput;
            if (!studentName || !password || fileInput.files.length === 0) {
                Utils.showModal('Error', 'Please fill in all fields and select an exam file.');
                return;
            }
            try {
                const encryptedData = await FileService.readTextFromFile({ target: fileInput });
                const config = await LicenseService.fetchConfig();
                const passphrase = config.encryption_passphrase;
                const decryptedData = FileService.decryptData(encryptedData, passphrase);
                if (!decryptedData) { Utils.showModal('Error', 'Failed to decrypt exam file.'); return; }
                if (!Utils.validatePassword(password, decryptedData.studentPassword)) { Utils.showModal('Error', 'Incorrect exam password.'); return; }
                this.currentExamData = decryptedData;
                this.studentAnswers = new Array(this.currentExamData.questions.length).fill(null);
                this.markedQuestions = new Array(this.currentExamData.questions.length).fill(false);
                this.currentQuestionIndex = 0;
                this.DOMElements.displayStudentName.textContent = studentName;
                this.DOMElements.examTitle.textContent = this.currentExamData.title;
                this.DOMElements.totalQuestions.textContent = this.currentExamData.questions.length;
                this.DOMElements.examEntryView.classList.add('hidden');
                this.DOMElements.examInterfaceView.classList.remove('hidden');
                this.renderQuestion(this.currentQuestionIndex);
                this.renderNavigator();
                this.startTimer(this.currentExamData.timer * 60);
            } catch (error) { console.error("Failed to start exam:", error); Utils.showModal('Error', 'An unexpected error occurred.'); }
        },

        submitExam: function() {
            clearInterval(this.examTimerInterval);
            let score = 0;
            this.currentExamData.questions.forEach((question, index) => {
                const studentAnswer = this.studentAnswers[index];
                const correctAnswer = question.correctAnswer;
                let isCorrect = false;
                
                console.log(`Question ${index + 1}:`, {
                    type: question.type,
                    studentAnswer,
                    correctAnswer
                });

                switch (question.type) {
                    case 'mcq':
                        // For MCQ, compare the selected option index
                        isCorrect = parseInt(studentAnswer) === parseInt(correctAnswer);
                        break;
                    case 'checkbox':
                        // For checkbox, compare arrays of selected indices
                        if (Array.isArray(correctAnswer) && Array.isArray(studentAnswer)) {
                            isCorrect = correctAnswer.length === studentAnswer.length && 
                                       correctAnswer.every(val => studentAnswer.includes(parseInt(val))) &&
                                       studentAnswer.every(val => correctAnswer.includes(parseInt(val)));
                        }
                        break;
                    case 'truefalse':
                        // For true/false, compare string values
                        isCorrect = studentAnswer === correctAnswer;
                        break;
                    case 'fillblank':
                    case 'subjective':
                    case 'image':
                        // For text-based questions, compare trimmed lowercase strings
                        if (studentAnswer && correctAnswer) {
                            isCorrect = studentAnswer.trim().toLowerCase() === correctAnswer.trim().toLowerCase();
                        }
                        break;
                    default:
                        isCorrect = false;
                }
                
                if (isCorrect) {
                    score++;
                    console.log(`Question ${index + 1}: CORRECT`);
                } else {
                    console.log(`Question ${index + 1}: INCORRECT`);
                }
            });

            const total = this.currentExamData.questions.length;
            const percentage = total > 0 ? Math.round((score / total) * 100) : 0;
            
            console.log(`Final Score: ${score}/${total} = ${percentage}%`);

            this.lastExamContext = { 
                title: this.currentExamData.title, 
                gradePassword: this.currentExamData.gradePassword, 
                studentScore: percentage, 
            };
            
            StorageService.saveExamResult(this.currentExamData.title, { 
                student: this.DOMElements.studentNameInput.value.trim(), 
                score, 
                total, 
                percentage, 
                date: new Date().toISOString(), 
            });
            
            this.DOMElements.examInterfaceView.classList.add('hidden');
            this.DOMElements.resultsView.classList.remove('hidden');
            this.renderResultsPage(percentage, score, total);
        },

        renderResultsPage: function(percentage, score, total) {
            this.DOMElements.scorePercentage.textContent = `${percentage}%`;
            this.DOMElements.resultStudentName.textContent = this.DOMElements.studentNameInput.value.trim();
            this.DOMElements.scoreDetails.textContent = `${score} out of ${total}`;
            this.DOMElements.scoreCircle.style.background = '';
            this.DOMElements.scoreCircle.classList.remove('bg-green-500', 'bg-red-500', 'bg-yellow-500');
            this.DOMElements.congratsMessage.classList.add('hidden');
            if (percentage >= 50) { 
                this.DOMElements.scoreCircle.style.background = '#10b981'; 
                this.DOMElements.congratsMessage.classList.remove('hidden'); 
            } else if (percentage < 30) { 
                this.DOMElements.scoreCircle.style.background = '#ef4444'; 
            } else { 
                this.DOMElements.scoreCircle.style.background = '#f59e0b'; 
            }
        },

        renderQuestion: function(index) {
            const question = this.currentExamData.questions[index];
            this.DOMElements.currentQuestion.textContent = index + 1;
            this.DOMElements.questionText.textContent = `Question ${index + 1}:`;
            this.DOMElements.questionBody.textContent = question.text;
            
            // Handle image display
            if (question.image) {
                this.DOMElements.questionImageContainer.querySelector('img').src = question.image;
                this.DOMElements.questionImageContainer.classList.remove('hidden');
            } else {
                this.DOMElements.questionImageContainer.classList.add('hidden');
            }

            let answersHTML = '';
            const currentAnswer = this.studentAnswers[index];

            switch (question.type) {
                case 'mcq':
                    answersHTML = question.options.map((opt, i) => 
                        `<div class="flex items-center">
                            <input type="radio" name="answer" id="option${i}" value="${i}" ${currentAnswer == i ? 'checked' : ''} class="h-5 w-5 text-indigo-600 focus:ring-indigo-500">
                            <label for="option${i}" class="ml-3 block text-gray-700 text-base">${opt}</label>
                        </div>`
                    ).join('');
                    break;
                    
                case 'checkbox':
                    answersHTML = question.options.map((opt, i) => 
                        `<div class="flex items-center">
                            <input type="checkbox" name="answer" id="option${i}" value="${i}" ${Array.isArray(currentAnswer) && currentAnswer.includes(i) ? 'checked' : ''} class="h-5 w-5 text-indigo-600 focus:ring-indigo-500">
                            <label for="option${i}" class="ml-3 block text-gray-700 text-base">${opt}</label>
                        </div>`
                    ).join('');
                    break;
                    
                case 'truefalse':
                    answersHTML = `
                        <div class="flex items-center">
                            <input type="radio" name="answer" id="option_true" value="True" ${currentAnswer === 'True' ? 'checked' : ''} class="h-5 w-5 text-indigo-600 focus:ring-indigo-500">
                            <label for="option_true" class="ml-3 block text-gray-700 text-base">True</label>
                        </div>
                        <div class="flex items-center">
                            <input type="radio" name="answer" id="option_false" value="False" ${currentAnswer === 'False' ? 'checked' : ''} class="h-5 w-5 text-indigo-600 focus:ring-indigo-500">
                            <label for="option_false" class="ml-3 block text-gray-700 text-base">False</label>
                        </div>`;
                    break;
                    
                case 'fillblank':
                case 'subjective':
                case 'image':
                    answersHTML = `<input type="text" class="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500" placeholder="Enter your answer" value="${currentAnswer || ''}">`;
                    break;
                    
                default:
                    answersHTML = `<p class="text-sm text-gray-500">Unsupported question type.</p>`;
            }

            this.DOMElements.questionAnswers.innerHTML = answersHTML;
            this.DOMElements.questionAnswers.querySelectorAll('input').forEach(input => {
                input.addEventListener('change', (e) => this.saveAnswer(e.target, index));
            });

            this.DOMElements.prevBtn.disabled = index === 0;
            this.DOMElements.nextBtn.disabled = index === this.currentExamData.questions.length - 1;
            this.DOMElements.submitBtn.classList.toggle('hidden', index !== this.currentExamData.questions.length - 1);
            this.DOMElements.nextBtn.classList.toggle('hidden', index === this.currentExamData.questions.length - 1);
            
            const isMarked = this.markedQuestions[index];
            this.DOMElements.markBtn.textContent = isMarked ? 'Unmark' : 'Mark';
            this.DOMElements.markBtn.classList.toggle('bg-yellow-400', isMarked);
            this.DOMElements.markBtn.classList.toggle('text-white', isMarked);
            this.updateNavigatorHighlight();
        },

        saveAnswer: function(inputElement, index) {
            const question = this.currentExamData.questions[index];
            
            if (question.type === 'checkbox') {
                // Handle multiple selection for checkbox questions
                const checkboxes = this.DOMElements.questionAnswers.querySelectorAll('input[type="checkbox"]:checked');
                this.studentAnswers[index] = Array.from(checkboxes).map(cb => parseInt(cb.value));
            } else if (inputElement.type === 'radio') {
                this.studentAnswers[index] = inputElement.value === 'True' || inputElement.value === 'False' ? inputElement.value : parseInt(inputElement.value);
            } else if (inputElement.type === 'text') {
                this.studentAnswers[index] = inputElement.value.trim();
            }
            
            console.log(`Saved answer for question ${index + 1}:`, this.studentAnswers[index]);
            this.updateNavigatorHighlight();
        },

        renderNavigator: function() {
            this.DOMElements.questionNavigator.innerHTML = '';
            this.currentExamData.questions.forEach((_, index) => {
                const button = document.createElement('button');
                button.className = 'question-nav-btn w-10 h-10 rounded-full bg-gray-200 text-gray-700 font-medium flex items-center justify-center';
                button.textContent = index + 1;
                button.addEventListener('click', () => this.goToQuestion(index));
                this.DOMElements.questionNavigator.appendChild(button);
            });
        },

        updateNavigatorHighlight: function() {
            const buttons = this.DOMElements.questionNavigator.children;
            for (let i = 0; i < buttons.length; i++) {
                const button = buttons[i];
                button.className = 'question-nav-btn w-10 h-10 rounded-full font-medium flex items-center justify-center';
                
                if (this.markedQuestions[i]) {
                    button.classList.add('marked');
                } else if (this.studentAnswers[i] !== null && this.studentAnswers[i] !== '' && 
                          (Array.isArray(this.studentAnswers[i]) ? this.studentAnswers[i].length > 0 : true)) {
                    button.classList.add('answered');
                } else {
                    button.classList.add('bg-gray-200', 'text-gray-700');
                }
                
                if (i === this.currentQuestionIndex) {
                    button.classList.add('active');
                }
            }
        },

        toggleMarkQuestion: function() {
            const isCurrentlyMarked = this.markedQuestions[this.currentQuestionIndex];
            this.markedQuestions[this.currentQuestionIndex] = !isCurrentlyMarked;
            this.DOMElements.markBtn.textContent = !isCurrentlyMarked ? 'Unmark' : 'Mark';
            this.DOMElements.markBtn.classList.toggle('bg-yellow-400', !isCurrentlyMarked);
            this.DOMElements.markBtn.classList.toggle('text-white', !isCurrentlyMarked);
            this.updateNavigatorHighlight();
        },

        nextQuestion: function() { 
            if (this.currentQuestionIndex < this.currentExamData.questions.length - 1) { 
                this.currentQuestionIndex++; 
                this.renderQuestion(this.currentQuestionIndex); 
            } 
        },
        
        previousQuestion: function() { 
            if (this.currentQuestionIndex > 0) { 
                this.currentQuestionIndex--; 
                this.renderQuestion(this.currentQuestionIndex); 
            } 
        },
        
        goToQuestion: function(index) { 
            this.currentQuestionIndex = index; 
            this.renderQuestion(index); 
        },
        
        startTimer: function(durationInSeconds) { 
            let timer = durationInSeconds; 
            this.examTimerInterval = setInterval(() => { 
                this.DOMElements.examTimer.textContent = Utils.formatTime(timer); 
                if (--timer < 0) { 
                    clearInterval(this.examTimerInterval); 
                    Utils.showModal('Time Up!', 'The exam will now be submitted automatically.'); 
                    this.submitExam(); 
                } 
            }, 1000); 
        },
        
        backToEntry: function() { 
            this.currentExamData = null; 
            this.lastExamContext = null; 
            this.studentAnswers = []; 
            this.markedQuestions = []; 
            this.currentQuestionIndex = 0; 
            clearInterval(this.examTimerInterval); 
            this.DOMElements.studentNameInput.value = ''; 
            this.DOMElements.examPasswordInput.value = ''; 
            this.DOMElements.examFileInput.value = ''; 
            this.DOMElements.resultsView.classList.add('hidden'); 
            this.DOMElements.examEntryView.classList.remove('hidden'); 
        },
        
        viewGrade: function() { 
            if (!this.lastExamContext) { 
                Utils.showModal('Error', 'No exam context found.'); 
                return; 
            } 
            this.DOMElements.gradeModal.classList.remove('hidden'); 
        },
        
        closeGradeModal: function() { 
            this.DOMElements.gradeModal.classList.add('hidden'); 
            this.DOMElements.gradePasswordInput.value = ''; 
            this.DOMElements.gradeDetailsContainer.classList.add('hidden'); 
        },
        
        loadGradeDetails: function() { 
            const enteredPassword = this.DOMElements.gradePasswordInput.value; 
            if (!Utils.validatePassword(enteredPassword, this.lastExamContext.gradePassword)) { 
                Utils.showModal('Error', 'Incorrect Grade Password.'); 
                return; 
            } 
            const submissions = StorageService.getExamResults(this.lastExamContext.title); 
            if (submissions.length === 0) { 
                Utils.showModal('Info', 'No submission data found to calculate class average.'); 
                return; 
            } 
            const totalPercentage = submissions.reduce((acc, sub) => acc + sub.percentage, 0); 
            const average = totalPercentage / submissions.length; 
            this.DOMElements.yourScore.textContent = `${this.lastExamContext.studentScore}%`; 
            this.DOMElements.classAverage.textContent = `${average.toFixed(1)}%`; 
            this.DOMElements.gradeDetailsContainer.classList.remove('hidden'); 
        },
    };

    // Make the main object globally accessible for testing purposes
    window.CbtStudentApp = CbtStudentApp;

    // Initialize the application
    CbtStudentApp.initialize();
})();
