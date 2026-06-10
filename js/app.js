document.addEventListener('DOMContentLoaded', function() {
    ensureToastContainer();
    initializeMobileMenu();
    initializeToasts();
    initializeModals();
    initializeAccordions();
    initializeAOS();
    initializeServiceCards();
    initializeAppointmentForm();
    initializeConfirmationPage();
    initializeTrackingForm();
    initializeTrackingResult();
    initializeCitizenDashboard();
    initializeAdminDashboard();
    initializeCaseManagement();
    initializeDocumentUpload();
});

const CASES_KEY = 'drcEmbassyCases';
const ACTIVE_CASE_KEY = 'drcEmbassyActiveCase';
const EMAILS_KEY = 'drcEmbassyEmails';

const timelineSteps = [
    { key: 'registered', label: 'Demande enregistree' },
    { key: 'appointment_confirmed', label: 'Rendez-vous confirme' },
    { key: 'documents_submitted', label: 'Documents deposes' },
    { key: 'administrative_review', label: 'Verification administrative' },
    { key: 'consular_validation', label: 'Validation consulaire' },
    { key: 'document_available', label: 'Document disponible' }
];

const statusLabels = {
    registered: 'Demande enregistree',
    appointment_confirmed: 'Rendez-vous confirme',
    documents_submitted: 'Documents deposes',
    administrative_review: 'Verification administrative',
    consular_validation: 'Validation consulaire',
    document_available: 'Document disponible',
    rejected: 'Demande refusee',
    additional_documents: 'Documents complementaires requis'
};

function initializeMobileMenu() {
    const menuBtn = document.getElementById('mobile-menu-btn');
    const mobileMenu = document.getElementById('mobile-menu');

    if (menuBtn && mobileMenu && !menuBtn.dataset.bound) {
        menuBtn.dataset.bound = 'true';
        menuBtn.addEventListener('click', function() {
            mobileMenu.classList.toggle('hidden');
        });
    }
}

function ensureToastContainer() {
    if (document.getElementById('toast-container')) return;

    const toastContainer = document.createElement('div');
    toastContainer.id = 'toast-container';
    toastContainer.className = 'fixed top-4 right-4 z-50 space-y-3';
    document.body.appendChild(toastContainer);
}

function showToast(message, type = 'success') {
    const toastContainer = document.getElementById('toast-container');
    if (!toastContainer) return;

    const toast = document.createElement('div');
    const bgColor = type === 'success' ? 'bg-green-600' : type === 'error' ? 'bg-red-600' : 'bg-blue-600';
    const icon = type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle';

    toast.className = `toast ${bgColor} text-white px-5 py-3 rounded shadow-lg flex items-center gap-3 text-sm max-w-sm`;
    toast.innerHTML = `
        <i class="fas fa-${icon}"></i>
        <span>${escapeHtml(message)}</span>
    `;

    toastContainer.appendChild(toast);

    setTimeout(() => {
        toast.style.animation = 'slideOut 0.25s ease-in forwards';
        setTimeout(() => toast.remove(), 260);
    }, 3500);
}

function initializeToasts() {
    const toastBtn = document.querySelectorAll('[data-toast]');
    toastBtn.forEach(btn => {
        if (btn.dataset.toastBound) return;
        btn.dataset.toastBound = 'true';
        btn.addEventListener('click', () => {
            const type = btn.dataset.toastType || 'success';
            showToast(btn.dataset.toast, type);
        });
    });
}

function initializeModals() {
    const modalTriggers = document.querySelectorAll('[data-modal]');
    modalTriggers.forEach(trigger => {
        trigger.addEventListener('click', () => {
            const modal = document.getElementById(trigger.dataset.modal);
            if (modal) modal.classList.remove('hidden');
        });
    });

    const modalCloses = document.querySelectorAll('[data-modal-close]');
    modalCloses.forEach(closeBtn => {
        closeBtn.addEventListener('click', () => {
            const modal = closeBtn.closest('.modal');
            if (modal) modal.classList.add('hidden');
        });
    });
}

function initializeAccordions() {
    const accordions = document.querySelectorAll('.accordion');
    accordions.forEach(accordion => {
        const header = accordion.querySelector('.accordion-header');
        const content = accordion.querySelector('.accordion-content');

        if (header && content) {
            header.addEventListener('click', () => {
                accordion.classList.toggle('active');
                content.style.maxHeight = content.style.maxHeight ? null : content.scrollHeight + 'px';
            });
        }
    });
}

function initializeAOS() {
    if (typeof AOS !== 'undefined') {
        AOS.init({ duration: 800, once: true });
    }
}

function initializeAppointmentForm() {
    const form = document.getElementById('appointment-form');
    if (!form) return;

    const dateInput = form.querySelector('[name="appointmentDate"]');
    if (dateInput) dateInput.min = getTodayIsoDate();

    form.addEventListener('submit', event => {
        event.preventDefault();

        if (!form.checkValidity()) {
            form.reportValidity();
            showToast('Veuillez remplir tous les champs obligatoires.', 'error');
            return;
        }

        const formData = new FormData(form);
        const appointmentDate = formData.get('appointmentDate');
        if (appointmentDate < getTodayIsoDate()) {
            showToast('Veuillez choisir une date future.', 'error');
            return;
        }

        const now = new Date();
        const caseNumber = generateCaseNumber(now);
        const serviceInput = form.querySelector('input[name="service"]:checked');
        const service = serviceInput ? serviceInput.value : '';
        const applicantName = `${formData.get('firstName').trim()} ${formData.get('lastName').trim()}`.trim();

        const dossier = {
            caseNumber,
            firstName: formData.get('firstName').trim(),
            lastName: formData.get('lastName').trim(),
            fullName: applicantName,
            passportNumber: formData.get('passportNumber').trim(),
            email: formData.get('email').trim(),
            service,
            appointmentDate,
            appointmentTime: formData.get('appointmentTime'),
            status: 'appointment_confirmed',
            createdAt: now.toISOString(),
            updatedAt: now.toISOString(),
            requestedDocuments: '',
            decision: '',
            documents: [],
            history: [
                createHistoryItem('Demande enregistree', now),
                createHistoryItem('Rendez-vous confirme', now)
            ],
            timeline: {
                registered: now.toISOString(),
                appointment_confirmed: now.toISOString()
            }
        };

        dossier.emailConfirmation = buildConfirmationEmail(dossier);
        saveCase(dossier);
        saveEmail(dossier.emailConfirmation);
        sessionStorage.setItem('drcEmbassyLastToast', 'Votre rendez-vous a ete enregistre avec succes.');
        window.location.href = `appointment-confirmation.html?case=${encodeURIComponent(caseNumber)}`;
    });
}

function initializeServiceCards() {
    const serviceInputs = document.querySelectorAll('input[name="service"]');
    if (!serviceInputs.length) return;

    const refresh = () => {
        serviceInputs.forEach(input => {
            const indicator = input.closest('label').querySelector('.w-5.h-5');
            if (!indicator) return;
            indicator.className = `w-5 h-5 border-2 ${input.checked ? 'border-[#0f2a4d]' : 'border-gray-300'} rounded-full flex items-center justify-center`;
            indicator.innerHTML = input.checked ? '<div class="w-2.5 h-2.5 bg-[#0f2a4d] rounded-full"></div>' : '';
        });
    };

    serviceInputs.forEach(input => input.addEventListener('change', refresh));
    refresh();
}

function initializeConfirmationPage() {
    const details = document.getElementById('appointment-details');
    if (!details) return;

    const dossier = getCurrentCase();
    if (!dossier) {
        details.innerHTML = `<p class="text-sm text-[#4a5568]">Aucun rendez-vous enregistre pour le moment.</p>`;
        return;
    }

    renderAppointmentDetails(details, dossier);
    const emailBody = document.getElementById('email-preview-body');
    const emailSubject = document.getElementById('email-preview-subject');
    if (emailSubject) emailSubject.textContent = dossier.emailConfirmation.subject;
    if (emailBody) emailBody.textContent = dossier.emailConfirmation.body;

    const lastToast = sessionStorage.getItem('drcEmbassyLastToast');
    if (lastToast) {
        showToast(lastToast);
        sessionStorage.removeItem('drcEmbassyLastToast');
    }
}

function initializeTrackingForm() {
    const form = document.getElementById('tracking-form');
    if (!form) return;

    form.addEventListener('submit', event => {
        event.preventDefault();
        const passportNumber = form.passportNumber.value.trim();
        const caseNumber = form.caseNumber.value.trim();
        const dossier = getCases().find(item => item.caseNumber === caseNumber && item.passportNumber === passportNumber);

        if (!dossier) {
            showToast('Aucun dossier ne correspond aux informations saisies.', 'error');
            return;
        }

        localStorage.setItem(ACTIVE_CASE_KEY, dossier.caseNumber);
        window.location.href = `tracking-result.html?case=${encodeURIComponent(dossier.caseNumber)}`;
    });
}

function initializeTrackingResult() {
    const container = document.getElementById('tracking-result-content');
    if (!container) return;

    const dossier = getCurrentCase();
    if (!dossier) {
        container.innerHTML = `<div class="card p-6"><p class="text-[#4a5568]">Aucun dossier trouve. Lancez une nouvelle recherche.</p></div>`;
        return;
    }

    container.innerHTML = renderTrackingResult(dossier);
}

function initializeCitizenDashboard() {
    const container = document.getElementById('citizen-dashboard-content');
    if (!container) return;

    const dossier = getCurrentCase() || getCases()[0];
    if (!dossier) {
        container.innerHTML = `<div class="card p-8 text-center text-[#4a5568]">Aucun dossier citoyen enregistre pour le moment.</div>`;
        return;
    }

    container.innerHTML = renderCitizenDashboard(dossier);
}

function initializeAdminDashboard() {
    const tbody = document.getElementById('admin-recent-cases');
    if (!tbody) return;

    const cases = getCases();
    tbody.innerHTML = cases.length ? cases.slice(0, 5).map(renderAdminRow).join('') : `
        <tr><td colspan="5" class="py-4 text-[#4a5568]">Aucun dossier enregistre.</td></tr>
    `;
}

function initializeCaseManagement() {
    const tbody = document.getElementById('case-management-body');
    if (!tbody) return;

    const search = document.getElementById('case-search');
    const filter = document.getElementById('case-status-filter');
    const render = () => renderCaseManagementRows(tbody, search ? search.value : '', filter ? filter.value : '');

    render();
    if (search) search.addEventListener('input', render);
    if (filter) filter.addEventListener('change', render);

    tbody.addEventListener('change', event => {
        if (!event.target.matches('[data-status-select]')) return;
        updateCaseStatus(event.target.dataset.caseNumber, event.target.value);
        render();
        showToast('Dossier mis a jour.');
    });

    tbody.addEventListener('click', event => {
        const button = event.target.closest('[data-case-action]');
        if (!button) return;

        const caseNumber = button.dataset.caseNumber;
        const action = button.dataset.caseAction;
        if (action === 'documents') {
            requestAdditionalDocuments(caseNumber);
            showToast('Documents ajoutes.');
        }
        if (action === 'approve') {
            updateCaseStatus(caseNumber, 'document_available', 'Validation effectuee');
            showToast('Validation effectuee.');
        }
        if (action === 'reject') {
            updateCaseStatus(caseNumber, 'rejected', 'Demande refusee');
            showToast('Dossier mis a jour.', 'info');
        }
        render();
    });
}

function initializeDocumentUpload() {
    const button = document.getElementById('mock-upload-button');
    const tbody = document.getElementById('upload-history-body');
    if (!button || !tbody) return;

    const render = () => {
        const dossier = getCurrentCase() || getCases()[0];
        const documents = dossier ? dossier.documents : [];
        tbody.innerHTML = documents.length ? documents.map(doc => `
            <tr class="border-b border-[#e1e5eb]">
                <td class="py-3">${escapeHtml(doc.name)}</td>
                <td class="py-3 text-[#4a5568]">${escapeHtml(doc.type)}</td>
                <td class="py-3 text-[#4a5568]">${escapeHtml(doc.size)}</td>
                <td class="py-3"><span class="status-badge status-pending">${escapeHtml(doc.status)}</span></td>
                <td class="py-3 text-[#4a5568]">${formatDateTime(doc.date)}</td>
            </tr>
        `).join('') : `<tr><td colspan="5" class="py-4 text-[#4a5568]">Aucun document ajoute.</td></tr>`;
    };

    button.addEventListener('click', () => {
        const dossier = getCurrentCase() || getCases()[0];
        if (!dossier) {
            showToast('Creez un rendez-vous avant dajouter des documents.', 'error');
            return;
        }

        const now = new Date();
        dossier.documents.push({
            name: `document_${dossier.documents.length + 1}.pdf`,
            type: 'PDF',
            size: '1.2 MB',
            status: 'Depose',
            date: now.toISOString()
        });
        dossier.timeline.documents_submitted = now.toISOString();
        dossier.status = 'documents_submitted';
        dossier.updatedAt = now.toISOString();
        dossier.history.push(createHistoryItem('Documents deposes', now));
        saveCase(dossier);
        render();
        showToast('Documents ajoutes.');
    });

    render();
}

function buildConfirmationEmail(dossier) {
    return {
        to: dossier.email,
        subject: 'Confirmation de votre rendez-vous consulaire',
        body: `Bonjour ${dossier.fullName},

Votre demande a bien ete enregistree.

Numero de dossier : ${dossier.caseNumber}
Type de service : ${dossier.service}
Date du rendez-vous : ${formatDate(dossier.appointmentDate)}
Heure : ${formatTime(dossier.appointmentTime)}
Passeport : ${dossier.passportNumber}

Veuillez conserver ces informations pour le suivi de votre dossier.

Ambassade de la Republique Democratique du Congo.`
    };
}

function generateCaseNumber(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const random = Math.floor(1000 + Math.random() * 9000);
    return `DRC-${year}-${month}${day}-${random}`;
}

function getCases() {
    try {
        return JSON.parse(localStorage.getItem(CASES_KEY)) || [];
    } catch (error) {
        return [];
    }
}

function saveCase(dossier) {
    const cases = getCases();
    const index = cases.findIndex(item => item.caseNumber === dossier.caseNumber);
    if (index >= 0) cases[index] = dossier;
    else cases.unshift(dossier);
    localStorage.setItem(CASES_KEY, JSON.stringify(cases));
    localStorage.setItem(ACTIVE_CASE_KEY, dossier.caseNumber);
}

function saveEmail(email) {
    const emails = JSON.parse(localStorage.getItem(EMAILS_KEY) || '[]');
    emails.unshift({ ...email, createdAt: new Date().toISOString() });
    localStorage.setItem(EMAILS_KEY, JSON.stringify(emails));
}

function getCurrentCase() {
    const params = new URLSearchParams(window.location.search);
    const caseNumber = params.get('case') || localStorage.getItem(ACTIVE_CASE_KEY);
    return getCases().find(item => item.caseNumber === caseNumber) || null;
}

function updateCaseStatus(caseNumber, status, actionLabel) {
    const dossier = getCases().find(item => item.caseNumber === caseNumber);
    if (!dossier) return;

    const now = new Date();
    dossier.status = status;
    dossier.updatedAt = now.toISOString();
    if (timelineSteps.some(step => step.key === status)) dossier.timeline[status] = now.toISOString();
    dossier.history.push(createHistoryItem(actionLabel || statusLabels[status] || 'Dossier mis a jour', now));
    saveCase(dossier);
}

function requestAdditionalDocuments(caseNumber) {
    const dossier = getCases().find(item => item.caseNumber === caseNumber);
    if (!dossier) return;

    const now = new Date();
    dossier.status = 'additional_documents';
    dossier.requestedDocuments = 'Documents complementaires demandes par le service consulaire.';
    dossier.updatedAt = now.toISOString();
    dossier.history.push(createHistoryItem('Documents complementaires demandes', now));
    saveCase(dossier);
}

function createHistoryItem(label, date) {
    return { label, date: date.toISOString() };
}

function renderAppointmentDetails(container, dossier) {
    container.innerHTML = `
        ${detailRow('Numero de dossier', dossier.caseNumber, true)}
        ${detailRow('Nom et prenom', dossier.fullName)}
        ${detailRow('Passeport', dossier.passportNumber)}
        ${detailRow('Email', dossier.email)}
        ${detailRow('Service', dossier.service)}
        ${detailRow('Date', formatDate(dossier.appointmentDate))}
        ${detailRow('Heure', formatTime(dossier.appointmentTime))}
        ${detailRow('Lieu', 'Embassy of the DRC')}
    `;
}

function renderTrackingResult(dossier) {
    return `
        <div class="card p-6 mb-8">
            <div class="flex items-center justify-between mb-6">
                <div>
                    <h1 class="text-2xl font-bold text-[#0f2a4d]">Application Status</h1>
                    <p class="text-[#4a5568]">Tracking ID: ${escapeHtml(dossier.caseNumber)}</p>
                </div>
                ${statusBadge(dossier.status)}
            </div>
            <div class="grid md:grid-cols-2 gap-6 mb-8">
                <div>
                    <h3 class="font-medium text-[#0f2a4d] mb-2">Case Details</h3>
                    <div class="space-y-2 text-sm">
                        ${detailRow('Applicant', dossier.fullName)}
                        ${detailRow('Passport', dossier.passportNumber)}
                        ${detailRow('Service', dossier.service)}
                        ${detailRow('Submission Date', formatDate(dossier.createdAt))}
                    </div>
                </div>
                <div>
                    <h3 class="font-medium text-[#0f2a4d] mb-2">Processing Information</h3>
                    <div class="space-y-2 text-sm">
                        ${detailRow('Appointment', `${formatDate(dossier.appointmentDate)} - ${formatTime(dossier.appointmentTime)}`)}
                        ${detailRow('Current Status', statusLabels[dossier.status] || dossier.status)}
                    </div>
                </div>
            </div>
            <h3 class="font-medium text-[#0f2a4d] mb-6">Progress Timeline</h3>
            ${renderTimeline(dossier)}
        </div>
        <div class="flex justify-between">
            <a href="tracking.html" class="btn-secondary px-6 py-3 font-medium">New Search</a>
        </div>
    `;
}

function renderCitizenDashboard(dossier) {
    return `
        <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <div class="card p-5"><div class="text-2xl font-bold text-[#0f2a4d] mb-1">1</div><div class="text-sm text-[#4a5568]">Rendez-vous programme</div></div>
            <div class="card p-5"><div class="text-2xl font-bold text-[#0f2a4d] mb-1">1</div><div class="text-sm text-[#4a5568]">Dossier actif</div></div>
            <div class="card p-5"><div class="text-2xl font-bold text-[#0f2a4d] mb-1">${dossier.documents.length}</div><div class="text-sm text-[#4a5568]">Documents ajoutes</div></div>
            <div class="card p-5"><div class="text-2xl font-bold text-[#0f2a4d] mb-1">${completedTimelineCount(dossier)}</div><div class="text-sm text-[#4a5568]">Etapes completees</div></div>
        </div>
        <div class="grid lg:grid-cols-3 gap-8">
            <div class="lg:col-span-2 space-y-8">
                <div class="card p-6">
                    <h2 class="font-semibold text-[#0f2a4d] mb-4">Rendez-vous programme</h2>
                    <table class="w-full text-sm">
                        <thead><tr class="border-b border-[#e1e5eb]"><th class="text-left py-3 text-[#4a5568] font-medium">Date</th><th class="text-left py-3 text-[#4a5568] font-medium">Service</th><th class="text-left py-3 text-[#4a5568] font-medium">Time</th><th class="text-left py-3 text-[#4a5568] font-medium">Status</th></tr></thead>
                        <tbody><tr class="border-b border-[#e1e5eb]"><td class="py-3">${formatDate(dossier.appointmentDate)}</td><td class="py-3">${escapeHtml(dossier.service)}</td><td class="py-3">${formatTime(dossier.appointmentTime)}</td><td class="py-3">${statusBadge(dossier.status)}</td></tr></tbody>
                    </table>
                </div>
                <div class="card p-6">
                    <h2 class="font-semibold text-[#0f2a4d] mb-4">Historique des actions</h2>
                    <div class="space-y-4">${dossier.history.map(item => renderHistoryItem(item)).join('')}</div>
                </div>
                <div class="card p-6">
                    <h2 class="font-semibold text-[#0f2a4d] mb-4">Progression du dossier</h2>
                    ${renderTimeline(dossier)}
                </div>
            </div>
            <div class="space-y-8">
                <div class="card p-6">
                    <h2 class="font-semibold text-[#0f2a4d] mb-4">Identite</h2>
                    <div class="text-center mb-4">
                        <div class="w-16 h-16 bg-[#1a4a7a] rounded-full flex items-center justify-center text-2xl font-bold text-white mx-auto mb-3">${initials(dossier.fullName)}</div>
                        <div class="font-medium text-[#0f2a4d]">${escapeHtml(dossier.fullName)}</div>
                        <div class="text-sm text-[#4a5568]">${escapeHtml(dossier.email)}</div>
                    </div>
                    <div class="space-y-2 text-sm">
                        ${detailRow('Passeport', dossier.passportNumber)}
                        ${detailRow('Numero de dossier', dossier.caseNumber, true)}
                        ${detailRow('Etat du dossier', statusLabels[dossier.status] || dossier.status)}
                    </div>
                </div>
                <div class="card p-6">
                    <h2 class="font-semibold text-[#0f2a4d] mb-4">Quick Actions</h2>
                    <div class="space-y-3">
                        <a href="appointment.html" class="block border border-[#e1e5eb] rounded p-3 hover:border-[#0f2a4d] transition text-sm"><i class="fas fa-calendar-plus mr-2 text-[#0f2a4d]"></i> Book Appointment</a>
                        <a href="upload-documents.html" class="block border border-[#e1e5eb] rounded p-3 hover:border-[#0f2a4d] transition text-sm"><i class="fas fa-cloud-upload-alt mr-2 text-[#0f2a4d]"></i> Upload Documents</a>
                        <a href="tracking.html" class="block border border-[#e1e5eb] rounded p-3 hover:border-[#0f2a4d] transition text-sm"><i class="fas fa-search mr-2 text-[#0f2a4d]"></i> Track Application</a>
                    </div>
                </div>
            </div>
        </div>
    `;
}

function renderTimeline(dossier) {
    return `
        <div class="mb-6">
            <div class="h-2 bg-[#e1e5eb] rounded overflow-hidden">
                <div class="h-full bg-[#0f2a4d]" style="width: ${completedTimelineCount(dossier) / timelineSteps.length * 100}%"></div>
            </div>
        </div>
        <ol class="relative border-l border-[#e1e5eb] ml-3 space-y-8">
            ${timelineSteps.map(step => {
                const done = Boolean(dossier.timeline[step.key]);
                return `
                    <li class="ml-6">
                        <div class="absolute -left-[9px] w-4 h-4 ${done ? 'bg-green-600' : 'bg-gray-300'} rounded-full"></div>
                        <h4 class="font-medium ${done ? 'text-[#0f2a4d]' : 'text-gray-500'}">${done ? '✓' : '⏳'} ${step.label}</h4>
                        <p class="text-sm ${done ? 'text-[#4a5568]' : 'text-gray-400'}">${done ? formatDateTime(dossier.timeline[step.key]) : 'En attente'}</p>
                    </li>
                `;
            }).join('')}
        </ol>
    `;
}

function renderCaseManagementRows(tbody, searchValue, statusFilter) {
    const query = searchValue.toLowerCase();
    const rows = getCases().filter(dossier => {
        const matchesQuery = [dossier.caseNumber, dossier.fullName, dossier.passportNumber, dossier.service].join(' ').toLowerCase().includes(query);
        const matchesStatus = !statusFilter || dossier.status === statusFilter;
        return matchesQuery && matchesStatus;
    });

    tbody.innerHTML = rows.length ? rows.map(dossier => `
        <tr class="border-b border-[#e1e5eb]">
            <td class="py-3 font-mono text-[#4a5568]">${escapeHtml(dossier.caseNumber)}</td>
            <td class="py-3">${escapeHtml(dossier.fullName)}</td>
            <td class="py-3">${escapeHtml(dossier.service)}</td>
            <td class="py-3">
                <select class="input-field px-3 py-2 text-sm" data-status-select data-case-number="${escapeHtml(dossier.caseNumber)}">
                    ${Object.keys(statusLabels).map(status => `<option value="${status}" ${status === dossier.status ? 'selected' : ''}>${statusLabels[status]}</option>`).join('')}
                </select>
            </td>
            <td class="py-3 text-[#4a5568]">${formatDate(dossier.createdAt)}</td>
            <td class="py-3">
                <div class="flex flex-wrap gap-2">
                    <button class="text-[#1a4a7a] hover:underline text-sm" data-case-action="documents" data-case-number="${escapeHtml(dossier.caseNumber)}">Documents</button>
                    <button class="text-green-700 hover:underline text-sm" data-case-action="approve" data-case-number="${escapeHtml(dossier.caseNumber)}">Valider</button>
                    <button class="text-red-700 hover:underline text-sm" data-case-action="reject" data-case-number="${escapeHtml(dossier.caseNumber)}">Refuser</button>
                </div>
            </td>
        </tr>
    `).join('') : `<tr><td colspan="6" class="py-4 text-[#4a5568]">Aucun dossier trouve.</td></tr>`;
}

function renderAdminRow(dossier) {
    return `
        <tr class="border-b border-[#e1e5eb]">
            <td class="py-3 font-mono text-[#4a5568]">${escapeHtml(dossier.caseNumber)}</td>
            <td class="py-3">${escapeHtml(dossier.fullName)}</td>
            <td class="py-3">${escapeHtml(dossier.service)}</td>
            <td class="py-3">${statusBadge(dossier.status)}</td>
            <td class="py-3 text-[#4a5568]">${formatDate(dossier.createdAt)}</td>
        </tr>
    `;
}

function renderHistoryItem(item) {
    return `
        <div class="flex items-center gap-3 text-sm">
            <div class="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center text-green-600"><i class="fas fa-check"></i></div>
            <div>
                <div class="font-medium text-[#0f2a4d]">${escapeHtml(item.label)}</div>
                <div class="text-[#4a5568]">${formatDateTime(item.date)}</div>
            </div>
        </div>
    `;
}

function detailRow(label, value, mono) {
    return `
        <div class="flex justify-between gap-4">
            <span class="text-[#4a5568]">${escapeHtml(label)}</span>
            <span class="font-medium ${mono ? 'font-mono' : ''} text-right">${escapeHtml(value || '-')}</span>
        </div>
    `;
}

function statusBadge(status) {
    const approved = ['consular_validation', 'document_available'].includes(status);
    const pending = ['registered', 'additional_documents'].includes(status);
    const rejected = status === 'rejected';
    const className = rejected ? 'status-pending' : approved ? 'status-approved' : pending ? 'status-pending' : 'status-progress';
    return `<span class="status-badge ${className}">${escapeHtml(statusLabels[status] || status)}</span>`;
}

function completedTimelineCount(dossier) {
    return timelineSteps.filter(step => dossier.timeline[step.key]).length;
}

function getTodayIsoDate() {
    const date = new Date();
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function formatDate(value) {
    if (!value) return '-';
    return new Intl.DateTimeFormat('fr-FR', { year: 'numeric', month: 'long', day: 'numeric' }).format(new Date(value));
}

function formatTime(value) {
    if (!value) return '-';
    const [hour, minute] = value.split(':');
    return `${hour}:${minute}`;
}

function formatDateTime(value) {
    if (!value) return '-';
    return new Intl.DateTimeFormat('fr-FR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    }).format(new Date(value));
}

function initials(name) {
    return name.split(' ').filter(Boolean).slice(0, 2).map(part => part[0].toUpperCase()).join('');
}

function escapeHtml(value) {
    return String(value)
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#039;');
}

function animateCounter(element, target, duration = 2000) {
    let start = 0;
    const increment = target / (duration / 16);

    const timer = setInterval(() => {
        start += increment;
        if (start >= target) {
            element.textContent = target.toLocaleString();
            clearInterval(timer);
        } else {
            element.textContent = Math.floor(start).toLocaleString();
        }
    }, 16);
}

const counterElements = document.querySelectorAll('[data-counter]');
const observerOptions = { threshold: 0.5 };

if ('IntersectionObserver' in window) {
    const counterObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const target = parseInt(entry.target.dataset.counter);
                animateCounter(entry.target, target);
                counterObserver.unobserve(entry.target);
            }
        });
    }, observerOptions);

    counterElements.forEach(el => counterObserver.observe(el));
}
