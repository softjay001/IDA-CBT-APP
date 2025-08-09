
// js/teacher.js

// --- Globals ---
let currentExam = {
    title: '', timer: 0, studentPassword: '', gradePassword: '', questions: [],
};
let currentSubmissions = []; // For CSV export
let currentQuestionImage = null; // Store image data

// --- DOM Elements ---
const DOMElements = {
    // Views
    dashboardView: document.getElementById('dashboardView'),
    createExamView: document.getElementById('createExamView'),
    gradeExamView: document.getElementById('gradeExamView'),
    // Create Exam
    addQuestionPanel: document.getElementById('addQuestionPanel'),
    questionsList: document.getElementById('questionsList'),
    questionCount: document.getElementById('questionCount'),
    questionForm: document.getElementById('questionForm'),
    questionType: document.getElementById('questionType'),
    questionText: document.getElementById('questionText'),
    answersSection: document.getElementById('answersSection'),
    imageUpload: document.getElementById('imageUpload'),
    examTitle: document.getElementById('examTitle'),
    examTimer: document.getElementById('examTimer'),
    studentPassword: document.getElementById('studentPassword'),
    gradePassword: document.getElementById('gradePassword'),
    // Grade Exam
    gradePasswordInput: document.getElementById('gradePasswordInput'),
    examFileInput: document.getElementById('examFile'),
    loadExamBtn: document.querySelector('#gradeForm button'),
    resultsSection: document.getElementById('resultsSection'),
    resultsTableBody: document.getElementById('resultsTableBody'),
    exportBtn: document.querySelector('#resultsSection button'),
    classAverage: document.querySelector('.stat-card:nth-child(1) div:first-child'),
    highestScore: document.querySelector('.stat-card:nth-child(2) div:first-child'),
    lowestScore: document.querySelector('.stat-card:nth-child(3) div:first-child'),
    totalStudents: document.querySelector('.stat-card:nth-child(4) div:first-child'),
};

// --- View Switching ---
function showDashboard() { 
    DOMElements.dashboardView.style.display = 'block'; 
    DOMElements.createExamView.style.display = 'none'; 
    DOMElements.gradeExamView.style.display = 'none'; 
}

function showCreateExam() { 
    DOMElements.dashboardView.style.display = 'none'; 
    DOMElements.createExamView.style.display = 'block'; 
    DOMElements.gradeExamView.style.display = 'none'; 
    resetExamForm(); 
}

function showGradeExam() { 
    DOMElements.dashboardView.style.display = 'none'; 
    DOMElements.createExamView.style.display = 'none'; 
    DOMElements.gradeExamView.style.display = 'block'; 
}

function showAddQuestion() { 
    console.log(`Checking question limit. Current count: ${currentExam.questions.length}, Trial active: ${LicenseService.isTrialActive()}`); 
    if (LicenseService.isQuestionLimitReached(currentExam.questions.length)) { 
        Utils.showModal('Trial Limit Reached', 'You have reached the 10-question limit for the trial version. Please renew your license to add more questions.'); 
        return; 
    } 
    DOMElements.addQuestionPanel.style.display = 'block'; 
    updateQuestionForm(); 
    currentQuestionImage = null; // Reset image for new question
}

function hideAddQuestion() { 
    DOMElements.addQuestionPanel.style.display = 'none'; 
    DOMElements.questionForm.reset(); 
    currentQuestionImage = null;
    clearImagePreview();
}

// --- Exam Logic ---
function resetExamForm() { 
    currentExam = { title: '', timer: 0, studentPassword: '', gradePassword: '', questions: [] }; 
    updateQuestionCount(); 
    DOMElements.questionsList.innerHTML = `<div class="text-center py-8"><div class="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-gray-100 text-gray-400 mb-3"><i class="fas fa-question-circle"></i></div><h3 class="text-sm font-medium text-gray-900">No questions added yet</h3><p class="mt-1 text-sm text-gray-500">Click "Add Question" to get started.</p></div>`; 
    DOMElements.examTitle.value = ''; 
    DOMElements.examTimer.value = ''; 
    DOMElements.studentPassword.value = ''; 
    DOMElements.gradePassword.value = ''; 
}

function updateQuestionCount() { 
    const count = currentExam.questions.length; 
    DOMElements.questionCount.textContent = `${count} ${count === 1 ? 'Question' : 'Questions'}`; 
}

function validateQuestionAnswers() {
    const type = DOMElements.questionType.value;
    let isValid = false;
    let errorMessage = '';

    switch (type) {
        case 'mcq':
            const mcqRadios = DOMElements.answersSection.querySelectorAll('input[name="correctAnswer"]');
            isValid = Array.from(mcqRadios).some(radio => radio.checked);
            errorMessage = 'Please select the correct answer for the multiple choice question.';
            break;

        case 'checkbox':
            const checkboxes = DOMElements.answersSection.querySelectorAll('input[name="correctAnswer"]');
            isValid = Array.from(checkboxes).some(checkbox => checkbox.checked);
            errorMessage = 'Please select at least one correct answer for the checkbox question.';
            break;

        case 'truefalse':
            const tfRadios = DOMElements.answersSection.querySelectorAll('input[name="correctAnswer"]');
            isValid = Array.from(tfRadios).some(radio => radio.checked);
            errorMessage = 'Please select True or False as the correct answer.';
            break;

        case 'fillblank':
        case 'subjective':
        case 'image':
            const textInput = DOMElements.answersSection.querySelector('input[type="text"], textarea');
            isValid = textInput && textInput.value.trim() !== '';
            errorMessage = 'Please provide the correct answer for this question.';
            break;

        default:
            isValid = true;
    }

    return { isValid, errorMessage };
}

function addQuestion() { 
    if (LicenseService.isQuestionLimitReached(currentExam.questions.length)) { 
        Utils.showModal('Trial Limit Reached', 'You have reached the 10-question limit for the trial version. Please renew your license.'); 
        return; 
    } 
    
    const questionText = DOMElements.questionText.value.trim(); 
    if (!questionText) { 
        Utils.showModal('Error', 'Question text cannot be empty.'); 
        return; 
    }

    // Validate that answers are provided
    const validation = validateQuestionAnswers();
    if (!validation.isValid) {
        Utils.showModal('Error', validation.errorMessage);
        return;
    }

    // Check if all option texts are filled for MCQ/Checkbox
    const type = DOMElements.questionType.value;
    if (type === 'mcq' || type === 'checkbox') {
        const optionInputs = DOMElements.answersSection.querySelectorAll('input[type="text"]');
        const hasEmptyOption = Array.from(optionInputs).some(input => input.value.trim() === '');
        if (hasEmptyOption) {
            Utils.showModal('Error', 'Please fill in all option texts before adding the question.');
            return;
        }
    }

    const newQuestion = { 
        id: Utils.generateId(), 
        type: type, 
        text: questionText, 
        options: [], 
        correctAnswer: null,
        image: currentQuestionImage // Store image data
    };

    if (type === 'mcq' || type === 'checkbox') { 
        const optionInputs = DOMElements.answersSection.querySelectorAll('input[type="text"]'); 
        const correctInputs = DOMElements.answersSection.querySelectorAll('input[name="correctAnswer"]'); 
        newQuestion.options = Array.from(optionInputs).map(input => input.value.trim()); 
        
        if (type === 'mcq') { 
            const checkedIndex = Array.from(correctInputs).findIndex(radio => radio.checked); 
            if (checkedIndex > -1) { 
                newQuestion.correctAnswer = checkedIndex; 
            } 
        } else { 
            newQuestion.correctAnswer = Array.from(correctInputs) 
                .map((checkbox, index) => checkbox.checked ? index : -1) 
                .filter(index => index !== -1); 
        } 
    } else if (type === 'truefalse') { 
        const trueFalseRadios = DOMElements.answersSection.querySelectorAll('input[name="correctAnswer"]'); 
        const checkedRadio = Array.from(trueFalseRadios).find(radio => radio.checked); 
        if (checkedRadio) { 
            newQuestion.correctAnswer = checkedRadio.value; 
        } 
    } else if (type === 'fillblank' || type === 'subjective' || type === 'image') { 
        const answerInput = DOMElements.answersSection.querySelector('input[type="text"], textarea');
        if (answerInput) {
            newQuestion.correctAnswer = answerInput.value.trim(); 
        }
    }

    currentExam.questions.push(newQuestion); 
    renderQuestionsList(); 
    hideAddQuestion(); 
}

function renderQuestionsList() { 
    if (currentExam.questions.length === 0) { 
        resetExamForm(); 
        return; 
    } 
    
    DOMElements.questionsList.innerHTML = ''; 
    currentExam.questions.forEach(q => { 
        const questionDiv = document.createElement('div'); 
        questionDiv.className = 'question-card bg-white rounded-lg shadow border border-gray-200 p-4 mb-3'; 
        
        const imagePreview = q.image ? `<img src="${q.image}" class="image-preview mt-2" alt="Question image">` : '';
        const answerPreview = getAnswerPreview(q);
        
        questionDiv.innerHTML = `
            <div class="flex justify-between items-start">
                <div class="flex-1">
                    <h4 class="font-medium text-gray-900">${q.text}</h4>
                    <p class="text-xs text-gray-500 mt-1">${Utils.getQuestionTypeName(q.type)}</p>
                    ${imagePreview}
                    <div class="mt-2 text-sm text-gray-600">
                        <strong>Answer:</strong> ${answerPreview}
                    </div>
                </div>
                <div class="flex space-x-2 ml-4">
                    <button class="text-indigo-600 hover:text-indigo-900" onclick="removeQuestion('${q.id}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>`; 
        DOMElements.questionsList.appendChild(questionDiv); 
    }); 
    updateQuestionCount(); 
}

function getAnswerPreview(question) {
    switch (question.type) {
        case 'mcq':
            return question.options[question.correctAnswer] || 'Not set';
        case 'checkbox':
            if (Array.isArray(question.correctAnswer)) {
                return question.correctAnswer.map(index => question.options[index]).join(', ') || 'Not set';
            }
            return 'Not set';
        case 'truefalse':
            return question.correctAnswer || 'Not set';
        case 'fillblank':
        case 'subjective':
        case 'image':
            return question.correctAnswer || 'Not set';
        default:
            return 'Not set';
    }
}

function removeQuestion(questionId) { 
    if (confirm('Are you sure you want to remove this question?')) { 
        currentExam.questions = currentExam.questions.filter(q => q.id !== questionId); 
        renderQuestionsList(); 
    } 
}

async function saveExam() { 
    currentExam.title = DOMElements.examTitle.value.trim(); 
    currentExam.timer = parseInt(DOMElements.examTimer.value, 10); 
    currentExam.studentPassword = DOMElements.studentPassword.value; 
    currentExam.gradePassword = DOMElements.gradePassword.value; 
    
    if (!currentExam.title || !currentExam.timer || !currentExam.studentPassword || !currentExam.gradePassword) { 
        Utils.showModal('Error', 'Please fill in all exam settings fields.'); 
        return; 
    } 
    
    if (currentExam.questions.length === 0) { 
        Utils.showModal('Error', 'Please add at least one question.'); 
        return; 
    } 
    
    try { 
        const config = await LicenseService.fetchConfig(); 
        const passphrase = config.encryption_passphrase; 
        const encryptedData = FileService.encryptData(currentExam, passphrase); 
        if (!encryptedData) throw new Error("Encryption failed"); 
        const filename = `${currentExam.title.replace(/\s+/g, '-').toLowerCase()}.question`; 
        FileService.exportFile(encryptedData, filename); 
        Utils.showModal('Success', `Exam "${currentExam.title}" saved successfully!`); 
        resetExamForm(); 
        showDashboard(); 
    } catch (error) { 
        console.error("Failed to save exam:", error); 
        Utils.showModal('Error', 'An unexpected error occurred while saving the exam.'); 
    } 
}

// --- Dynamic Form Logic ---
function addOption(button) { 
    const container = button.parentNode; 
    const optionDiv = document.createElement('div'); 
    optionDiv.className = 'flex items-center space-x-2 mt-2'; 
    const inputType = DOMElements.questionType.value === 'mcq' ? 'radio' : 'checkbox'; 
    optionDiv.innerHTML = `
        <input type="${inputType}" name="correctAnswer" class="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded">
        <input type="text" class="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500" placeholder="Option text" required>
        <button type="button" class="text-red-500 hover:text-red-700" onclick="removeOption(this)">
            <i class="fas fa-times"></i>
        </button>`; 
    container.insertBefore(optionDiv, button); 
}

function removeOption(button) {
    const optionDiv = button.parentNode;
    optionDiv.remove();
}

function clearImagePreview() {
    const imageUpload = document.getElementById('imageUpload');
    const existingPreview = imageUpload.querySelector('.file-preview-container');
    if (existingPreview) {
        existingPreview.remove();
    }
    const fileInput = document.getElementById('questionImage');
    if (fileInput) {
        fileInput.value = '';
    }
}

function showImagePreview(file) {
    clearImagePreview();
    
    const imageUpload = document.getElementById('imageUpload');
    const previewContainer = document.createElement('div');
    previewContainer.className = 'file-preview-container';
    
    const reader = new FileReader();
    reader.onload = function(e) {
        previewContainer.innerHTML = `
            <img src="${e.target.result}" class="image-preview" alt="Question image preview">
            <div class="file-preview-info">
                <div class="file-preview-name">${file.name}</div>
                <div class="file-preview-size">${(file.size / 1024).toFixed(2)} KB</div>
            </div>
            <button type="button" class="text-red-500 hover:text-red-700" onclick="clearImagePreview(); currentQuestionImage = null;">
                <i class="fas fa-times"></i>
            </button>
        `;
        currentQuestionImage = e.target.result; // Store as base64 data URL
    };
    reader.readAsDataURL(file);
    
    imageUpload.appendChild(previewContainer);
}

function updateQuestionForm() { 
    const type = DOMElements.questionType.value; 
    const answersSection = DOMElements.answersSection; 
    answersSection.innerHTML = ''; 
    DOMElements.imageUpload.style.display = type === 'image' ? 'block' : 'none'; 
    
    let content = ''; 
    switch (type) { 
        case 'mcq': 
        case 'checkbox': 
            content = `
                <div class="space-y-3" id="options-container">
                    <label class="block text-sm font-medium text-gray-700">Options (Mark correct answer)</label>
                    <div class="flex items-center space-x-2">
                        <input type="${type === 'mcq' ? 'radio' : 'checkbox'}" name="correctAnswer" class="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded" required>
                        <input type="text" class="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500" placeholder="Option 1" required>
                        <button type="button" class="text-red-500 hover:text-red-700" onclick="removeOption(this)">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    <div class="flex items-center space-x-2">
                        <input type="${type === 'mcq' ? 'radio' : 'checkbox'}" name="correctAnswer" class="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded">
                        <input type="text" class="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500" placeholder="Option 2" required>
                        <button type="button" class="text-red-500 hover:text-red-700" onclick="removeOption(this)">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    <button type="button" class="mt-2 text-sm text-indigo-600 hover:text-indigo-800" onclick="addOption(this)">+ Add Option</button>
                </div>`; 
            break; 
        case 'truefalse': 
            content = `
                <div class="space-y-3">
                    <label class="block text-sm font-medium text-gray-700">Correct Answer</label>
                    <div class="flex items-center">
                        <input type="radio" name="correctAnswer" value="True" class="h-4 w-4" required>
                        <label class="ml-2">True</label>
                    </div>
                    <div class="flex items-center">
                        <input type="radio" name="correctAnswer" value="False" class="h-4 w-4">
                        <label class="ml-2">False</label>
                    </div>
                </div>`; 
            break; 
        case 'fillblank': 
            content = `
                <div>
                    <label class="block text-sm font-medium text-gray-700">Correct Answer</label>
                    <input type="text" class="block w-full px-3 py-2 border border-gray-300 rounded-md" placeholder="Enter the correct answer" required>
                </div>`; 
            break; 
        case 'subjective': 
            content = `
                <div>
                    <label class="block text-sm font-medium text-gray-700">Sample/Expected Answer</label>
                    <textarea class="block w-full px-3 py-2 border border-gray-300 rounded-md" rows="3" placeholder="Enter a sample or expected answer" required></textarea>
                </div>`; 
            break; 
        case 'image': 
            content = `
                <div>
                    <label class="block text-sm font-medium text-gray-700">Correct Answer</label>
                    <input type="text" class="block w-full px-3 py-2 border border-gray-300 rounded-md" placeholder="Enter the correct answer for this image question" required>
                </div>`; 
            break; 
    } 
    answersSection.innerHTML = content; 

    // Add image upload handler if image type
    if (type === 'image') {
        const imageInput = document.getElementById('questionImage');
        if (imageInput) {
            imageInput.addEventListener('change', function(e) {
                const file = e.target.files[0];
                if (file) {
                    showImagePreview(file);
                }
            });
        }
    }
}

// --- Grading Logic ---
async function loadExamResults() {
    const gradePassword = DOMElements.gradePasswordInput.value;
    const file = DOMElements.examFileInput.files[0];

    if (!gradePassword || !file) {
        Utils.showModal('Error', 'Please provide the grade password and select an exam file.');
        return;
    }

    try {
        const encryptedData = await FileService.readTextFromFile({ target: DOMElements.examFileInput });
        const config = await LicenseService.fetchConfig();
        const passphrase = config.encryption_passphrase;
        const examData = FileService.decryptData(encryptedData, passphrase);

        if (!examData) {
            Utils.showModal('Error', 'Failed to decrypt exam file. It might be corrupt.');
            return;
        }

        if (!Utils.validatePassword(gradePassword, examData.gradePassword)) {
            Utils.showModal('Error', 'Incorrect Grade Password.');
            return;
        }

        // Password is correct, now fetch results
        const submissions = StorageService.getExamResults(examData.title);
        currentSubmissions = submissions; // Store for CSV export
        renderGradebook(submissions);
        DOMElements.resultsSection.style.display = 'block';

    } catch (error) {
        console.error("Failed to load exam results:", error);
        Utils.showModal('Error', 'An unexpected error occurred.');
    }
}

function renderGradebook(submissions) {
    if (submissions.length === 0) {
        DOMElements.resultsTableBody.innerHTML = `<tr><td colspan="5" class="text-center py-4">No student submissions found for this exam.</td></tr>`;
        // Reset stats
        DOMElements.classAverage.textContent = 'N/A';
        DOMElements.highestScore.textContent = 'N/A';
        DOMElements.lowestScore.textContent = 'N/A';
        DOMElements.totalStudents.textContent = '0';
        return;
    }

    let tableHTML = '';
    let totalPercentage = 0;
    let scores = submissions.map(s => s.percentage);

    submissions.forEach(sub => {
        totalPercentage += parseFloat(sub.percentage);
        tableHTML += `
            <tr class="hover:bg-gray-50">
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">${sub.student}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${sub.score}/${sub.total}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm">
                    <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${sub.percentage >= 50 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}">
                        ${sub.percentage}%
                    </span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${new Date(sub.date).toLocaleDateString()}</td>
            </tr>
        `;
    });

    DOMElements.resultsTableBody.innerHTML = tableHTML;

    // Calculate and display stats
    DOMElements.classAverage.textContent = `${(totalPercentage / submissions.length).toFixed(1)}%`;
    DOMElements.highestScore.textContent = `${Math.max(...scores)}%`;
    DOMElements.lowestScore.textContent = `${Math.min(...scores)}%`;
    DOMElements.totalStudents.textContent = submissions.length;
}

function exportResults() {
    if (currentSubmissions.length === 0) {
        Utils.showModal('Info', 'There are no results to export.');
        return;
    }

    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Student Name,Score,Total,Percentage,Date\r\n";

    currentSubmissions.forEach(sub => {
        const row = [sub.student, sub.score, sub.total, sub.percentage, new Date(sub.date).toISOString()].join(",");
        csvContent += row + "\r\n";
    });

    const examTitle = DOMElements.gradePasswordInput.value; // A bit of a hack to get the title context
    const filename = `grades-${examTitle.replace(/\s+/g, '-') || 'export'}.csv`;
    FileService.exportFile(csvContent, filename);
}

function toggleMobileSidebar() {
    const sidebar = document.getElementById('mobile-sidebar');
    if (sidebar.style.display === 'none' || sidebar.style.display === '') {
        sidebar.style.display = 'block';
    } else {
        sidebar.style.display = 'none';
    }
}

// --- Initialization ---
document.addEventListener('DOMContentLoaded', async () => {
    await LicenseService.initialize();
    showDashboard();
    DOMElements.questionType.addEventListener('change', updateQuestionForm);
    DOMElements.loadExamBtn.addEventListener('click', loadExamResults);
    DOMElements.exportBtn.addEventListener('click', exportResults);
});
