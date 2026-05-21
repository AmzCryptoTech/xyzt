export const dictionary = {
    en: {
        space_title: "Here and Now",
        post_btn: "Publish",
        placeholder: "What's happening?",
        nav_profile: "Profile",
        nav_faq: "FAQ",
        profile_title: "Your Profile",
        profile_desc: "Your nickname will only appear on new posts.",
        profile_nick_placeholder: "Choose a nickname",
        profile_save_btn: "Save Nickname",
        profile_saved_alert: "Profile saved!",
        search_label_placeholder: "Create or search labels...",
        go_label_btn: "Go",
        faq_title: "What is xyzt?",
        faq_intro: "xyzt is an ephemeral social network divided into two explorable dimensions.",
        faq_space_title: "Space (Here and Now):",
        faq_space_desc: "Posts are anchored to the physical coordinates from which you write. You can only read what has been published within a 5-kilometer radius of your current location.",
        faq_time_title: "Time (Labels):",
        faq_time_desc: "Posts defy physical distance and are grouped into rooms called 'Labels' (e.g., #music, #gemini). Anyone in the world can enter a label and read the messages inside.",
        faq_clock_title: "The Clock:",
        faq_clock_desc: "Nothing is permanent on xyzt. Every single post, whether in space or time, has a clearly visible expiration time. Once the timer reaches zero, the post is deleted forever."
    },
    it: {
        space_title: "Qui e Ora",
        post_btn: "Pubblica",
        placeholder: "Cosa sta succedendo?",
        nav_profile: "Profilo",
        nav_faq: "FAQ",
        profile_title: "Il tuo Profilo",
        profile_desc: "Il tuo Nickname sarà visibile solo sui nuovi post.",
        profile_nick_placeholder: "Scegli un nickname",
        profile_save_btn: "Salva Nickname",
        profile_saved_alert: "Profilo salvato!",
        search_label_placeholder: "Crea o cerca label...",
        go_label_btn: "Vai",
        faq_title: "Cos'è xyzt?",
        faq_intro: "xyzt è un social network effimero diviso in due dimensioni esplorabili.",
        faq_space_title: "Space (Qui e Ora):",
        faq_space_desc: "I post sono ancorati alle coordinate fisiche da cui scrivi. Puoi leggere solo ciò che è stato pubblicato nel raggio di 5 chilometri dalla tua posizione attuale.",
        faq_time_title: "Time (Etichette):",
        faq_time_desc: "I post sfidano la distanza fisica e sono raggruppati in stanze chiamate 'Label' (es. #musica, #gemini). Chiunque nel mondo può entrare in una label e leggere i messaggi al suo interno.",
        faq_clock_title: "L'Orologio:",
        faq_clock_desc: "Niente è permanente su xyzt. Ogni singolo post, che sia nello spazio o nel tempo, ha un tempo di scadenza ben visibile. Una volta che il timer scende a zero, il post viene eliminato per sempre."
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