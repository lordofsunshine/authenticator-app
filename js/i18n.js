class I18n {
    constructor() {
        this.translations = {
            en: {
                'placeholder.secretKey': 'Enter secret key',
                'button.add': 'Add',
                'upload.text': 'Drop QR code or click to select',
                'upload.hint': 'Supports JPG, PNG, WebP',
                'section.codes': 'Authentication Codes',
                'empty.text': 'Add your first key to get started',
                'alert.duplicate': 'This key is already added',
                'alert.invalid_qr': 'Invalid QR code format',
                'alert.qr_not_found': 'QR code not found in image',
                'alert.error_processing': 'Error processing image',
                'alert.error_loading': 'Error loading image',
                'alert.error_reading': 'Error reading file',
                'alert.invalid_file': 'Invalid file type',
                'prompt.key_name': 'Enter a name for this key:',
                'default.key_name': 'My Key',
                'default.unnamed': 'Unnamed',
                'default.from_url': 'From URL',
                'notification.code_copied': 'Code copied to clipboard',
                'notification.link_copied': 'Link copied to clipboard',
                'notification.language_changed': 'Language changed to English',
                'button.copy_code': 'Copy code',
                'button.copy_link': 'Copy link',
                'button.delete': 'Delete'
            },
            ru: {
                'placeholder.secretKey': 'Введите секретный ключ',
                'button.add': 'Добавить',
                'upload.text': 'Перетащите QR-код или нажмите для выбора',
                'upload.hint': 'Поддерживаются JPG, PNG, WebP',
                'section.codes': 'Коды аутентификации',
                'empty.text': 'Добавьте первый ключ для начала работы',
                'alert.duplicate': 'Этот ключ уже добавлен',
                'alert.invalid_qr': 'Неверный формат QR-кода',
                'alert.qr_not_found': 'QR-код не найден на изображении',
                'alert.error_processing': 'Ошибка при обработке изображения',
                'alert.error_loading': 'Ошибка загрузки изображения',
                'alert.error_reading': 'Ошибка чтения файла',
                'alert.invalid_file': 'Выбран неверный тип файла',
                'prompt.key_name': 'Введите название для ключа:',
                'default.key_name': 'Мой ключ',
                'default.unnamed': 'Без названия',
                'default.from_url': 'Из ссылки',
                'notification.code_copied': 'Код скопирован в буфер обмена',
                'notification.link_copied': 'Ссылка скопирована в буфер обмена',
                'notification.language_changed': 'Язык изменен на русский',
                'button.copy_code': 'Копировать код',
                'button.copy_link': 'Копировать ссылку',
                'button.delete': 'Удалить'
            }
        };
        
        this.currentLang = localStorage.getItem('language') || 'en';
        this.init();
    }
    
    init() {
        this.updateLanguageButtons();
        this.translatePage();
        this.bindEvents();
    }
    
    bindEvents() {
        const langButtons = document.querySelectorAll('.lang-btn');
        langButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                const lang = btn.getAttribute('data-lang');
                this.setLanguage(lang);
            });
        });
        
        document.addEventListener('DOMContentLoaded', () => {
            this.updateLanguageButtons();
            this.translatePage();
        });
    }
    
    updateLanguageButtons() {
        const langButtons = document.querySelectorAll('.lang-btn');
        langButtons.forEach(btn => {
            const lang = btn.getAttribute('data-lang');
            if (lang === this.currentLang) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
    }
    
    setLanguage(lang) {
        if (this.currentLang === lang) return;
        
        this.currentLang = lang;
        localStorage.setItem('language', lang);
        
        this.translatePage();
        this.updateLanguageButtons();
        
        const message = this.translate('notification.language_changed');
        app.showNotification(message);
    }
    
    translatePage() {
        const elements = document.querySelectorAll('[data-i18n]');
        elements.forEach(el => {
            const key = el.getAttribute('data-i18n');
            
            if (el.tagName === 'INPUT' && el.getAttribute('placeholder')) {
                el.setAttribute('placeholder', this.translate(key));
            } else {
                el.textContent = this.translate(key);
            }
        });
    }
    
    translate(key) {
        const translations = this.translations[this.currentLang];
        return translations[key] || key;
    }
}

const i18n = new I18n(); 