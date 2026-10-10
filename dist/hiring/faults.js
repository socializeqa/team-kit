/**
 * Why a careers door (the upload, the CV read, the application) says no, as a
 * code the form words in the reader's own language. The server never sends a
 * sentence: a door that answered in English answered every page in English,
 * and a thrown fetch once showed "Failed to fetch" to an applicant. One list,
 * read by the doors and the form, so they never drift apart.
 */
import { pluralOf, fill } from "./locale.js";
export const CAREERS_FAULTS = [
    /** Too many tries from one place; `wait` says for how long, in seconds. */
    "busy",
    /** A required field is missing or wrong. */
    "fields",
    /** The age is not a number within the bounds. */
    "age",
    /** A yes/no question on the form was not answered yes or no. */
    "yesno",
    /** A phone or WhatsApp number that cannot be a real number. */
    "phone",
    /** The portfolio link is not a web address. */
    "link",
    /** A file that is not a PDF under 8 MB. */
    "file",
    /** No CV. */
    "cv",
    /** A file the form holds is no longer with us (a tab left open overnight). */
    "lost",
    /** A role question left empty, or a yes/no one answered otherwise. */
    "answers",
    /** The role closed while they were applying. */
    "closed",
    /** Something broke on our side. */
    "broken",
];
export function isCareersFault(value) {
    return CAREERS_FAULTS.includes(value);
}
/** Whole minutes to wait, at least one. */
export function waitMinutes(seconds) {
    return Math.max(1, Math.ceil((seconds ?? 60) / 60));
}
/** "15 minutes" in each language, by the number's plural form. */
const MINUTES = {
    en: { one: "# minute", other: "# minutes" },
    ar: { zero: "# دقيقة", one: "دقيقة", two: "دقيقتين", few: "# دقائق", many: "# دقيقة", other: "# دقيقة" },
    fr: { one: "# minute", other: "# minutes" },
    it: { one: "# minuto", other: "# minuti" },
    ru: { one: "# минуту", few: "# минуты", many: "# минут", other: "# минуты" },
    zh: { other: "# 分钟" },
};
/**
 * The form's words for each fault. English and Arabic are whole; the other
 * languages have every line but the yes/no one, which falls back to English
 * until it is translated.
 */
export const FAULT_WORDS = {
    en: {
        network: "The connection dropped before it reached us. Check it and try again.",
        busy: "Too many tries from here. Try again in {minutes}.",
        fields: "A field with a mark is still empty. Fill it in and send again.",
        age: "Your age in years, from {min} to {max}.",
        yesno: "Answer the yes-or-no question on the form.",
        phone: "That phone number is too short or too long for its country.",
        link: "The portfolio link should be a web address, starting with https://",
        file: "Files have to be PDFs under 8 MB.",
        cv: "Attach your CV as a PDF.",
        lost: "Your CV has expired on our side since you attached it. Attach it again, then send.",
        answers: "Answer each question for this role.",
        closed: "This role stopped taking applications while you were applying.",
        broken: "Something broke on our side. Try again in a minute.",
    },
    ar: {
        network: "انقطع الاتصال قبل أن يصل إلينا ما أرسلته. يرجى التحقق من اتصالك والمحاولة مرة أخرى.",
        busy: "وصل عدد المحاولات إلى الحد المسموح. يرجى المحاولة مرة أخرى بعد {minutes}.",
        fields: "أحد الحقول المطلوبة لا يزال فارغًا. يرجى تعبئته ثم إعادة الإرسال.",
        age: "يرجى إدخال العمر بين {min} و{max} سنة.",
        yesno: "يرجى الإجابة بنعم أو لا عن السؤال الوارد في النموذج.",
        phone: "رقم الهاتف أقصر أو أطول من المعتاد في الدولة المختارة.",
        link: "يجب أن يكون رابط معرض الأعمال عنوان موقع يبدأ بـ https://‎",
        file: "يجب أن تكون الملفات بصيغة PDF وبحجم أقل من 8 ميجابايت.",
        cv: "يرجى إرفاق السيرة الذاتية بصيغة PDF.",
        lost: "انتهت مدة حفظ سيرتك الذاتية لدينا. يرجى إرفاقها مرة أخرى ثم إرسال الطلب.",
        answers: "يرجى الإجابة عن جميع أسئلة هذه الوظيفة.",
        closed: "أُغلق باب التقديم على هذه الوظيفة أثناء تقديمك عليها.",
        broken: "حدث خلل من جهتنا. يرجى المحاولة مرة أخرى بعد دقيقة.",
    },
    fr: {
        network: "La connexion a été coupée en cours d'envoi. Vérifiez-la et réessayez.",
        busy: "Trop de tentatives. Réessayez dans {minutes}.",
        fields: "Un champ obligatoire est encore vide. Remplissez-le et envoyez à nouveau.",
        age: "Votre âge doit être compris entre {min} et {max} ans.",
        phone: "Ce numéro est trop court ou trop long pour son pays.",
        link: "Le lien du portfolio doit être une adresse web commençant par https://",
        file: "Les fichiers doivent être des PDF de moins de 8 Mo.",
        cv: "Joignez votre CV au format PDF.",
        lost: "Le CV que vous aviez joint a expiré de notre côté. Joignez-le à nouveau, puis envoyez votre candidature.",
        answers: "Répondez à toutes les questions de ce poste.",
        closed: "Les candidatures pour ce poste ont été clôturées pendant que vous postuliez.",
        broken: "Un problème est survenu de notre côté. Réessayez dans une minute.",
    },
    it: {
        network: "La connessione si è interrotta durante l'invio. Controllala e riprova.",
        busy: "Troppi tentativi. Riprova tra {minutes}.",
        fields: "Un campo obbligatorio è ancora vuoto. Compilalo e invia di nuovo.",
        age: "Indica la tua età in anni, da {min} a {max}.",
        phone: "Questo numero è troppo corto o troppo lungo per il suo paese.",
        link: "Il link al portfolio deve essere un indirizzo web che inizia con https://",
        file: "I file devono essere in PDF e non superare gli 8 MB.",
        cv: "Allega il tuo CV in PDF.",
        lost: "Il CV che avevi allegato è scaduto nei nostri sistemi. Allegalo di nuovo, poi invia la candidatura.",
        answers: "Rispondi a tutte le domande di questa posizione.",
        closed: "Le candidature per questa posizione si sono chiuse mentre ti candidavi.",
        broken: "Si è verificato un errore da parte nostra. Riprova tra un minuto.",
    },
    ru: {
        network: "Соединение прервалось во время отправки. Проверьте подключение и попробуйте ещё раз.",
        busy: "Слишком много попыток. Попробуйте ещё раз через {minutes}.",
        fields: "Обязательное поле не заполнено. Заполните его и отправьте снова.",
        age: "Укажите возраст: от {min} до {max} лет.",
        phone: "Номер слишком короткий или слишком длинный для этой страны.",
        link: "Ссылка на портфолио должна быть веб-адресом и начинаться с https://",
        file: "Принимаем только файлы PDF до 8 МБ.",
        cv: "Прикрепите резюме в формате PDF.",
        lost: "Срок хранения резюме у нас истёк. Прикрепите его снова и отправьте отклик.",
        answers: "Ответьте на все вопросы по этой вакансии.",
        closed: "Пока вы заполняли анкету, приём откликов на эту вакансию завершился.",
        broken: "У нас произошёл сбой. Попробуйте ещё раз через минуту.",
    },
    zh: {
        network: "网络连接在传输中断开，请检查网络后重试。",
        busy: "尝试次数过多，请在 {minutes}后重试。",
        fields: "还有必填项未填写，请填写后重新提交。",
        age: "请填写 {min} 至 {max} 岁之间的年龄。",
        phone: "号码位数不符合该国家/地区的规则。",
        link: "作品集链接须为以 https:// 开头的网址。",
        file: "文件须为 PDF 格式，且小于 8 MB。",
        cv: "请上传 PDF 格式的简历。",
        lost: "您之前上传的简历在我们这边已过期，请重新上传后再提交。",
        answers: "请回答本职位的所有问题。",
        closed: "在您申请期间，该职位已停止招聘。",
        broken: "我们这边出了点问题，请过一分钟再试。",
    },
};
/**
 * A fault as the reader is told it. `minutes` fills the wait of `busy`
 * (waitMinutes of the door's `wait`); `age` the bounds the door checked.
 */
export function faultWords(fault, locale = "en", { minutes = 1, age = { min: 18, max: 70 } } = {}) {
    const text = FAULT_WORDS[locale][fault] ?? FAULT_WORDS.en[fault] ?? FAULT_WORDS.en.broken ?? "";
    const forms = MINUTES[locale];
    const wait = (forms[pluralOf(minutes, locale)] ?? forms.other).replace("#", String(minutes));
    return fill(text, { minutes: wait, min: String(age.min), max: String(age.max) });
}
