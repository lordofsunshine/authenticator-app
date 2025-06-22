window.va = window.va || function () { (window.vaq = window.vaq || []).push(arguments); };

class Authenticator {
    constructor() {
        this.codes = JSON.parse(localStorage.getItem('authCodes') || '[]');
        this.init();
        this.loadFromURL();
    }

    init() {
        this.bindEvents();
        this.renderCodes();
        this.startTimer();
    }

    bindEvents() {
        document.getElementById('addKey').addEventListener('click', () => this.addKey());
        document.getElementById('secretKey').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.addKey();
        });

        const uploadArea = document.getElementById('uploadArea');
        const fileInput = document.getElementById('qrFile');

        uploadArea.addEventListener('click', () => fileInput.click());
        uploadArea.addEventListener('dragover', this.handleDragOver.bind(this));
        uploadArea.addEventListener('dragleave', this.handleDragLeave.bind(this));
        uploadArea.addEventListener('drop', this.handleDrop.bind(this));
        fileInput.addEventListener('change', (e) => this.handleFileSelect(e.target.files[0]));

        document.addEventListener('paste', this.handlePaste.bind(this));
    }

    handleDragOver(e) {
        e.preventDefault();
        document.getElementById('uploadArea').classList.add('dragover');
    }

    handleDragLeave(e) {
        e.preventDefault();
        document.getElementById('uploadArea').classList.remove('dragover');
    }

    handleDrop(e) {
        e.preventDefault();
        document.getElementById('uploadArea').classList.remove('dragover');
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            this.handleFileSelect(files[0]);
        }
    }

    handlePaste(e) {
        const items = e.clipboardData.items;
        for (let item of items) {
            if (item.type.indexOf('image') !== -1) {
                const file = item.getAsFile();
                this.handleFileSelect(file);
                break;
            }
        }
    }

    handleFileSelect(file) {
        if (!file || !file.type.startsWith('image/')) {
            alert(i18n.translate('alert.invalid_file'));
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                canvas.width = img.width;
                canvas.height = img.height;
                ctx.drawImage(img, 0, 0);
                
                try {
                    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                    const code = jsQR(imageData.data, imageData.width, imageData.height);
                    
                    if (code) {
                        this.parseQRCode(code.data);
                    } else {
                        alert(i18n.translate('alert.qr_not_found'));
                    }
                } catch (error) {
                    alert(i18n.translate('alert.error_processing') + ': ' + error.message);
                }
            };
            img.onerror = () => {
                alert(i18n.translate('alert.error_loading'));
            };
            img.src = e.target.result;
        };
        reader.onerror = () => {
            alert(i18n.translate('alert.error_reading'));
        };
        reader.readAsDataURL(file);
    }

    parseQRCode(data) {
        try {
            const url = new URL(data);
            if (url.protocol === 'otpauth:' && url.hostname === 'totp') {
                const secret = url.searchParams.get('secret');
                const issuer = url.searchParams.get('issuer') || url.pathname.split('/')[1] || 'Unknown';
                
                if (secret) {
                    const isDuplicate = this.codes.some(code => code.secret.toUpperCase() === secret.toUpperCase());
                    if (isDuplicate) {
                        alert(i18n.translate('alert.duplicate'));
                        return;
                    }
                    this.addCodeItem(secret, issuer);
                }
            }
        } catch (e) {
            alert(i18n.translate('alert.invalid_qr'));
        }
    }

    addKey() {
        const input = document.getElementById('secretKey');
        const secret = input.value.trim().replace(/\s/g, '');
        
        if (!secret) return;
        
        const isDuplicate = this.codes.some(code => code.secret.toUpperCase() === secret.toUpperCase());
        if (isDuplicate) {
            alert(i18n.translate('alert.duplicate'));
            return;
        }
        
        const label = prompt(i18n.translate('prompt.key_name'), i18n.translate('default.key_name'));
        if (label === null) return;
        
        this.addCodeItem(secret, label || i18n.translate('default.unnamed'));
        input.value = '';
    }

    addCodeItem(secret, label) {
        const id = Date.now().toString();
        const codeItem = {
            id,
            secret: secret.toUpperCase(),
            label
        };
        
        this.codes.push(codeItem);
        this.saveCodes();
        this.renderCodes();
    }

    generateTOTP(secret) {
        const key = this.base32Decode(secret);
        const epoch = Math.floor(Date.now() / 1000);
        const counter = Math.floor(epoch / 30);
        
        const buffer = new ArrayBuffer(8);
        const view = new DataView(buffer);
        view.setUint32(4, counter, false);
        
        return this.hmacSha1(key, new Uint8Array(buffer))
            .then(hash => {
                const offset = hash[hash.length - 1] & 0xf;
                const binary = ((hash[offset] & 0x7f) << 24) |
                              ((hash[offset + 1] & 0xff) << 16) |
                              ((hash[offset + 2] & 0xff) << 8) |
                              (hash[offset + 3] & 0xff);
                
                const otp = binary % 1000000;
                return otp.toString().padStart(6, '0');
            });
    }

    async hmacSha1(key, data) {
        const cryptoKey = await crypto.subtle.importKey(
            'raw', key, { name: 'HMAC', hash: 'SHA-1' }, false, ['sign']
        );
        const signature = await crypto.subtle.sign('HMAC', cryptoKey, data);
        return new Uint8Array(signature);
    }

    base32Decode(base32) {
        const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
        let bits = '';
        
        for (let char of base32) {
            const index = alphabet.indexOf(char);
            if (index === -1) continue;
            bits += index.toString(2).padStart(5, '0');
        }
        
        const bytes = [];
        for (let i = 0; i < bits.length - 4; i += 8) {
            bytes.push(parseInt(bits.substr(i, 8), 2));
        }
        
        return new Uint8Array(bytes);
    }

    async renderCodes() {
        const container = document.getElementById('codesList');
        
        if (this.codes.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <svg viewBox="0 0 24 24">
                        <path d="M12,17A2,2 0 0,0 14,15C14,13.89 13.1,13 12,13A2,2 0 0,0 10,15A2,2 0 0,0 12,17M18,8A2,2 0 0,1 20,10V20A2,2 0 0,1 18,22H6A2,2 0 0,1 4,20V10C4,8.89 4.9,8 6,8H7V6A5,5 0 0,1 12,1A5,5 0 0,1 17,6V8H18M12,3A3,3 0 0,0 9,6V8H15V6A3,3 0 0,0 12,3Z" />
                    </svg>
                    <p>${i18n.translate('empty.text')}</p>
                </div>
            `;
            return;
        }

        container.innerHTML = '';
        
        for (const code of this.codes) {
            const codeValue = await this.generateTOTP(code.secret);
            const timeLeft = 30 - (Math.floor(Date.now() / 1000) % 30);
            
            const codeElement = document.createElement('div');
            codeElement.className = 'code-item';
            codeElement.innerHTML = `
                <div class="code-info">
                    <div class="code-label" onclick="app.renameCode('${code.id}')">${code.label}</div>
                    <div class="code-value">${codeValue}</div>
                </div>
                <div class="code-timer">
                    <div class="timer-circle" style="background: conic-gradient(#ffffff ${(timeLeft / 30) * 360}deg, #333 0deg)">
                        ${timeLeft}
                    </div>
                </div>
                <div class="code-actions">
                    <button class="action-btn" onclick="app.copyCode('${codeValue}')" title="${i18n.translate('button.copy_code')}">
                        <svg viewBox="0 0 24 24">
                            <path d="M19,21H8V7H19M19,5H8A2,2 0 0,0 6,7V21A2,2 0 0,0 8,23H19A2,2 0 0,0 21,21V7A2,2 0 0,0 19,5M16,1H4A2,2 0 0,0 2,3V17H4V3H16V1Z" />
                        </svg>
                    </button>
                    <button class="action-btn" onclick="app.copyLink('${code.secret}')" title="${i18n.translate('button.copy_link')}">
                        <svg viewBox="0 0 24 24">
                            <path d="M3.9,12C3.9,10.29 5.29,8.9 7,8.9H11V7H7A5,5 0 0,0 2,12A5,5 0 0,0 7,17H11V15.1H7C5.29,15.1 3.9,13.71 3.9,12M8,13H16V11H8V13M17,7H13V8.9H17C18.71,8.9 20.1,10.29 20.1,12C20.1,13.71 18.71,15.1 17,15.1H13V17H17A5,5 0 0,0 22,12A5,5 0 0,0 17,7Z" />
                        </svg>
                    </button>
                    <button class="action-btn" onclick="app.removeCode('${code.id}')" title="${i18n.translate('button.delete')}">
                        <svg viewBox="0 0 24 24">
                            <path d="M19,4H15.5L14.5,3H9.5L8.5,4H5V6H19M6,19A2,2 0 0,0 8,21H16A2,2 0 0,0 18,19V7H6V19Z" />
                        </svg>
                    </button>
                </div>
            `;
            
            container.appendChild(codeElement);
        }
    }

    copyCode(code) {
        navigator.clipboard.writeText(code).then(() => {
            this.showNotification(i18n.translate('notification.code_copied'));
        });
    }

    copyLink(secret) {
        const url = `${window.location.origin}${window.location.pathname}?key=${encodeURIComponent(secret)}`;
        navigator.clipboard.writeText(url).then(() => {
            this.showNotification(i18n.translate('notification.link_copied'));
        });
    }

    removeCode(id) {
        this.codes = this.codes.filter(code => code.id !== id);
        this.saveCodes();
        this.renderCodes();
    }

    showNotification(message) {
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #333;
            color: white;
            padding: 1rem 1.5rem;
            border-radius: 8px;
            z-index: 1001;
            animation: slideIn 0.3s ease;
        `;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => notification.remove(), 300);
        }, 2000);
    }

    saveCodes() {
        localStorage.setItem('authCodes', JSON.stringify(this.codes));
    }

    loadFromURL() {
        const urlParams = new URLSearchParams(window.location.search);
        const key = urlParams.get('key');
        
        if (key) {
            const isDuplicate = this.codes.some(code => code.secret.toUpperCase() === key.toUpperCase());
            if (!isDuplicate) {
                this.addCodeItem(key, i18n.translate('default.from_url'));
            }
            window.history.replaceState({}, document.title, window.location.pathname);
        }
    }

    startTimer() {
        setInterval(() => {
            this.updateTimers();
        }, 1000);
    }
    
    updateTimers() {
        const timerElements = document.querySelectorAll('.timer-circle');
        const now = Date.now() / 1000;
        const timeLeft = 30 - (now % 30);
        const percentage = (timeLeft / 30) * 100;
        
        timerElements.forEach(timer => {
            const degrees = (percentage / 100) * 360;
            timer.style.background = `conic-gradient(#ffffff ${degrees}deg, #333 0deg)`;
            timer.textContent = Math.ceil(timeLeft);
        });
        
        if (timeLeft < 0.5 || (timeLeft > 29.5 && timeLeft < 30)) {
            this.renderCodes();
        }
    }

    renameCode(id) {
        const codeItem = this.codes.find(code => code.id === id);
        if (!codeItem) return;
        
        const newLabel = prompt(i18n.translate('prompt.rename_key'), codeItem.label);
        if (newLabel === null) return;
        
        if (newLabel.trim() !== '') {
            codeItem.label = newLabel.trim();
            this.saveCodes();
            this.renderCodes();
            this.showNotification(i18n.translate('notification.renamed'));
        }
    }
}

let app;

document.addEventListener('DOMContentLoaded', () => {
    window.app = new Authenticator();
    app = window.app;
}); 