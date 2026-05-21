export const dictionary = {
    en: {
        space_title: "Here and Now",
        post_btn: "Publish",
        placeholder: "What's happening?"
    },
    it: {
        space_title: "Qui e Ora",
        post_btn: "Pubblica",
        placeholder: "Cosa sta succedendo?"
    }
};

let currentLang = 'en';

export function setLanguage(lang) {
    currentLang = lang;
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (dictionary[currentLang][key]) {
            // Controllo specifico per i campi di input e le textarea
            if (el.tagName === 'TEXTAREA' || el.tagName === 'INPUT') {
                el.placeholder = dictionary[currentLang][key]; // Cambia il testo fantasma
            } else {
                el.innerText = dictionary[currentLang][key];   // Cambia il testo reale
            }
        }
    });
}