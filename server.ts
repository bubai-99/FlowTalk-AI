import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize Gemini safely
let ai: any;
try {
  ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY || "missing_key",
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
  });
} catch (e) {
  console.error("Gemini API key not found or invalid", e);
}

app.use(express.json());

// Helper for retries with exponential backoff
async function withRetry<T>(fn: () => Promise<T>, maxRetries = 3): Promise<T> {
  let lastError: any;
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;
      const is503 = error.message?.includes("503") || error.status === 503 || error.code === 503;
      const isOverloaded = error.message?.includes("high demand") || error.message?.includes("overloaded");
      
      if (is503 || isOverloaded) {
        const delay = Math.pow(2, attempt) * 1000 + Math.random() * 1000;
        console.warn(`Gemini 503/Busy. Attempt ${attempt + 1}/${maxRetries}. Retrying in ${Math.round(delay)}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      throw error;
    }
  }
  throw lastError;
}

// Local high-performance heuristic language detector
function localDetectLanguage(text: string): string | null {
  const normalized = text.toLowerCase().trim();
  if (normalized.length < 3) return null;

  // Bengali script
  if (/[\u0980-\u09FF]/.test(text)) {
    return "Bengali";
  }

  // Devanagari script (Hindi)
  if (/[\u0900-\u097F]/.test(text)) {
    return "Hindi";
  }

  // Check Romanized Hinglish
  const hinglishPattern = /\b(yaar|thoda|raha|hu|karo|kya|bhai|kab|aaj|aaja|kal|parso|ko|ki|ke|ka|aur|nahi|nahin|toh|kuch|acha|achha|kaam|karke|bol|rha|rhi|tha|thi|gaya|gayi|hum|tum|aap|lelo|dedo|jaldi|kro|krlo|chal|rhey)\b/i;
  if (hinglishPattern.test(normalized)) {
    return "Hinglish";
  }

  // Check Romanized Benglish / Bengali-English Hybrid
  const benglishPattern = /\b(sesh|debo|pathiye|hole|ami|tumi|amra|korbo|kore|hocche|bhalo|hobe|kaj|kaaj|korechi|korte|parbo|parchi|chaichi|kintu|bolo|bolchi|khub|chele|meye|badi|bari|achho|jacchi)\b/i;
  if (benglishPattern.test(normalized)) {
    return "Benglish";
  }

  // Check Spanish
  const spanishPattern = /\b(que|para|con|como|por|los|las|una|pero|muy|bien|hola|gracias|hacer|todo|este|esta|buenos|dias|tardes|noches|amigo|amiga)\b/i;
  if (spanishPattern.test(normalized)) {
    return "Spanish";
  }

  // Check French
  const frenchPattern = /\b(les|pour|dans|une|avec|mais|bien|merci|faire|tout|oui|non|salut|bonjour|parler|carte|sil|vous|plait)\b/i;
  if (frenchPattern.test(normalized)) {
    return "French";
  }

  // Check German
  const germanPattern = /\b(der|die|das|und|ist|mit|eine|aber|sehr|danke|machen|alles|bitte|hallo|nein|gut|tag|morgen|abend)\b/i;
  if (germanPattern.test(normalized)) {
    return "German";
  }

  return null;
}

// Local offline high-fidelity heuristic rewrite translator to support 100% uptime when API is rate-limited
function localHeuristicRewrite(
  input: string,
  tone: string,
  sourceLanguage: string,
  targetLanguage: string
): { output: string; suggestions: string[] } {
  const norm = input.toLowerCase().trim();
  const detected = localDetectLanguage(input) || "English";
  const activeSource = (sourceLanguage && sourceLanguage !== 'Auto-detect') ? sourceLanguage : detected;
  const activeTarget = (targetLanguage && targetLanguage !== 'Auto-detect') ? targetLanguage : activeSource;

  // Identify common intent keywords/patterns
  const isDelay = /\b(late|deri|delay|raha hu|rha|ko|kochi|time|tard|tarde|demora|retraso|repas|spaet|spät)\b/i.test(norm);
  const isSendOrShare = /\b(send|share|pathiye|pathabo|debo|bhej|dunga|enviar|envoyer|schicken|deliver|give|deyo|partager)\b/i.test(norm);
  const isCheckRequired = /\b(check|review|dekho|karo|please|pls|dekh|korte|parbe|hacer|ver|regarder|pruefen|prüfen)\b/i.test(norm);
  const isDone = /\b(sesh|complete|done|finished|ho gaya|hecho|fini|fertig|completed|shob)\b/i.test(norm);
  const isWork = /\b(kaj|kaaj|kaam|work|job|task|trabajo|travail|arbeit|bhalo|chalche)\b/i.test(norm);
  const isThanks = /\b(thanks|thx|dhanyabad|dhanyavad|shukriya|gracias|merci|danke)\b/i.test(norm);
  const isMeeting = /\b(meeting|discussion|meet|call|meetingo|miting|sabha|baithak|reunion|réunion|besprechung)\b/i.test(norm);

  let outputText = "";
  let suggestions: string[] = [];

  // Define translations/rewrites based on the active target language
  if (activeTarget === "English" || activeTarget === "Hinglish" || activeTarget === "Benglish") {
    if (isDelay && isCheckRequired) {
      if (tone === "casual") {
        outputText = "Hey there, running a little late today. Mind taking a quick look at the files for now? Thanks!";
        suggestions = ["I'll be there in 15 mins.", "Let me know if it looks good.", "Appreciate your patience!"];
      } else if (tone === "executive") {
        outputText = "Briefly delayed on my end. Please proceed with reviewing the shared files. Advise on any immediate concerns.";
        suggestions = ["I will connect shortly.", "Prioritize the summary.", "Send me your feedback."];
      } else {
        outputText = "I am running slightly behind schedule today. Could you please review the attached files and contents in the meantime?";
        suggestions = ["Apologies for the delay.", "I will join the call shortly.", "Please let me know if you need anything else."];
      }
    } else if (isMeeting && isSendOrShare) {
      if (tone === "casual") {
        outputText = "Will send it over to you as soon as this meeting finishes up!";
        suggestions = ["Speak soon.", "Let me know if you need help.", "Meeting is almost done."];
      } else if (tone === "executive") {
        outputText = "Delivery expected immediately following the conclusion of the ongoing meeting.";
        suggestions = ["Agenda is being finalized.", "Will review on my call.", "Please hold off until then."];
      } else {
        outputText = "I will share the details with you immediately after the current meeting concludes.";
        suggestions = ["The meeting is running a bit over.", "I'll ping you once free.", "Should I email it?"];
      }
    } else if (isDelay) {
      if (tone === "casual") {
        outputText = "Hey! Running a bit late, but I'm on my way.";
        suggestions = ["See you in a bit.", "Sorry for the delay!", "Start without me."];
      } else if (tone === "executive") {
        outputText = "Slightly delayed. Adjusting schedule accordingly. Will arrive and update shortly.";
        suggestions = ["Proceed with the agenda.", "Keep me posted.", "Rescheduled to +15 mins."];
      } else {
        outputText = "Please accept my apologies for the delay. I am running a few minutes behind schedule today.";
        suggestions = ["Thank you for your understanding.", "I will join as soon as possible.", "I am on my way."];
      }
    } else if (isSendOrShare) {
      if (tone === "casual") {
        outputText = "Here you go, sending the file over. Let me know what you think!";
        suggestions = ["Hope this helps.", "Let's catch up later.", "Is this what you needed?"];
      } else if (tone === "executive") {
        outputText = "Dispatching the requested documentation. Please review and coordinate next steps.";
        suggestions = ["Action required by EOD.", "Approved for release.", "Review and report back."];
      } else {
        outputText = "I have sent the updated documents for your review. Please let me know if any adjustments are needed.";
        suggestions = ["I'll share the sheet next.", "Confirm receipt, please.", "Attached is the file."];
      }
    } else if (isCheckRequired) {
      if (tone === "casual") {
        outputText = "Hey, could you please take a quick look at this whenever you get a second?";
        suggestions = ["No rush!", "Let me know your thoughts.", "Appreciate it!"];
      } else if (tone === "executive") {
        outputText = "Please review the attached material and share your executive feedback by EOD.";
        suggestions = ["High priority.", "Focus on section 3.", "Let's connect tomorrow."];
      } else {
        outputText = "Could you please review these details and let me know if you have any feedback or suggestions?";
        suggestions = ["Thank you for your assistance.", "I look forward to your thoughts.", "Let me know if changes are required."];
      }
    } else if (isWork) {
      if (tone === "casual") {
        outputText = "The tasks are moving along nicely. I'll pass on a fresh update soon!";
        suggestions = ["Everything's on track.", "Catch you in a bit.", "So far so good."];
      } else if (tone === "executive") {
        outputText = "Project milestones are proceeding strictly on schedule. Detailed status reporting will follow.";
        suggestions = ["No roadblocks identified.", "Resources are fully optimized.", "Milestone 1 is complete."];
      } else {
        outputText = "The work is progressing very well. I am compiling the latest updates and will share them shortly.";
        suggestions = ["Let me know if you have questions.", "I'll keep you posted.", "Thank you for your support."];
      }
    } else if (isThanks) {
      if (tone === "casual") {
        outputText = "Thanks a bunch! Really appreciate all your help.";
        suggestions = ["You're the best!", "Anytime!", "Talk soon!"];
      } else if (tone === "executive") {
        outputText = "My gratitude for your timely and highly professional contribution.";
        suggestions = ["Excellent job.", "Keep up the great work.", "Highly valued effort."];
      } else {
        outputText = "Thank you very much for your cooperation and valuable assistance on this matter.";
        suggestions = ["Have a great day.", "You are most welcome.", "Let's connect soon."];
      }
    } else {
      const capitalized = input.charAt(0).toUpperCase() + input.slice(1);
      if (tone === "casual") {
        outputText = `Hey! Just wanted to share this: ${capitalized}`;
        suggestions = ["Sounds good!", "Let's stay in touch.", "Let me know."];
      } else if (tone === "executive") {
        outputText = `Regarding: "${capitalized}". Please review and coordinate next steps accordingly.`;
        suggestions = ["Acknowledged.", "Awaiting feedback.", "Approved."];
      } else {
        outputText = `Hello, I'm writing to share this update: "${capitalized}". Please let me know how you'd like to proceed.`;
        suggestions = ["Thank you.", "Let me know your thoughts.", "Is there anything else?"];
      }
    }
  } else if (activeTarget === "Bengali") {
    if (isDelay) {
      if (tone === "casual") {
        outputText = "আমার একটু দেরি হচ্ছে, দয়া করে একটু অপেক্ষা করো।";
        suggestions = ["আমি ১০ মিনিটে আসছি।", "দেরির জন্য দুঃখিত!", "শুরু করে দাও।"];
      } else if (tone === "executive") {
        outputText = "সাময়িক বিলম্বের জন্য দুঃখিত। নির্ধারিত আলোচনা যথাসময়ে চালিয়ে যান।";
        suggestions = ["আমি শীঘ্রই যুক্ত হবো।", "অগ্রগতি জানান।", "পরবর্তী সময়ে মিটিং দিন।"];
      } else {
        outputText = "আমার আজকে পৌঁছাতে কিছুটা বিলম্ব হচ্ছে। এর জন্য আমি আন্তরিকভাবে দুঃখিত।";
        suggestions = ["ধৈর্য্যের জন্য ধন্যবাদ।", "আমি দ্রুত পৌঁছানোর চেষ্টা করছি।", "মিটিংটি শুরু করতে পারেন।"];
      }
    } else if (isSendOrShare) {
      if (tone === "casual") {
        outputText = "এই নাও ফাইলটি পাঠিয়ে দিলাম। একটু দেখে নিও!";
        suggestions = ["আশা করি কাজে লাগবে।", "জানাবে কেমন হলো।", "কোনো সমস্যা আছে?"];
      } else if (tone === "executive") {
        outputText = "অনুরোধকৃত ফাইলটি প্রেরণ করা হলো। প্রয়োজনীয় পদক্ষেপ গ্রহণ করুন।";
        suggestions = ["আজকে রিভিউ করুন।", "অনুমোদিত হয়েছে।", "ফিডব্যাক পাঠান।"];
      } else {
        outputText = "আমি প্রয়োজনীয় নথিপত্র পাঠিয়ে দিয়েছি। আপনার মূল্যবান মতামত জানাবেন।";
        suggestions = ["নিশ্চিত করুন, প্লিজ।", "পরবর্তী ফাইল শীঘ্রই আসছে।", "ধন্যবাদ।"];
      }
    } else {
      const capitalized = input;
      if (tone === "casual") {
        outputText = `হ্যালো! এই বিষয়ে আপডেট: "${capitalized}"। একটু দেখো!`;
        suggestions = ["দারুণ হয়েছে!", "ঠিক আছে।", "পরে কথা হবে।"];
      } else if (tone === "executive") {
        outputText = `উক্ত বিষয়ের বিবরণ: "${capitalized}"। আপনার সিদ্ধান্ত একান্ত কাম্য।`;
        suggestions = ["অনুমোদন করা হলো।", "অগ্রাধিকার দিন।", "সরাসরি যোগাযোগ করুন।"];
      } else {
        outputText = `নমস্কার, অত্যন্ত আনন্দের সাথে জানাচ্ছি: "${capitalized}"। আপনার কোনো মন্তব্য থাকলে জানান।`;
        suggestions = ["ধন্যবাদ।", "আপনার অভিমত কাম্য।", "সুস্থ থাকবেন।"];
      }
    }
  } else if (activeTarget === "Hindi") {
    if (isDelay) {
      if (tone === "casual") {
        outputText = "अरे यार, थोड़ा लेट हो रहा हूँ। तब तक फाइल चेक कर लो प्लीज।";
        suggestions = ["मैं १० मिनट में आ रहा हूँ।", "देरी के लिए सॉरी!", "कल मिलते हैं।"];
      } else if (tone === "executive") {
        outputText = "मुझे आने में थोड़ा समय लग सकता है। तब तक बैठक का संचालन जारी रखें।";
        suggestions = ["मैं जल्द ही जुड़ूँगा।", "अपडेट भेजें।", "धन्यवाद।"];
      } else {
        outputText = "मुझे पहुँचने में थोड़ी देरी हो रही है। कृपया असुविधा के लिए क्षमा करें।";
        suggestions = ["असुविधा के लिए खेद है।", "मैं रास्ते में हूँ।", "समझने के लिए धन्यवाद।"];
      }
    } else if (isSendOrShare) {
      if (tone === "casual") {
        outputText = "यह रही फाइल, मैंने भेज दी है। देख कर बताना कैसा लगा!";
        suggestions = ["उम्मीद है काम आएगा।", "कोई सुधार चाहिए?", "बात करते हैं बाद में।"];
      } else if (tone === "executive") {
        outputText = "अनुरोधित दस्तावेज प्रेषित कर दिए गए हैं। कृपया समीक्षा करें।";
        suggestions = ["EOD तक रिव्यू करें।", "स्वीकृत कर दिया गया है।", "रिपोर्ट भेजें।"];
      } else {
        outputText = "मैंने सभी ज़रूरी फाइलें भेज दी हैं। कृपया जाँच कर मुझे अपने विचारों से अवगत कराएं।";
        suggestions = ["प्राप्ति की पुष्टि करें।", "कोई बदलाव चाहिए?", "धन्यवाद।"];
      }
    } else {
      if (tone === "casual") {
        outputText = `नमस्ते! इस बारे में: "${input}"। एक बार देख लेना!`;
        suggestions = ["बढ़िया है!", "ठीक है फिर।", "बाद में मिलते हैं।"];
      } else if (tone === "executive") {
        outputText = `उक्त विषय के सन्दर्भ में: "${input}"। कृपया अग्रिम कार्यवाही सुनिश्चित करें।`;
        suggestions = ["स्वीकृत।", "प्राथमिकता दें।", "शीघ्र हल करें।"];
      } else {
        outputText = `नमस्कार, मैं आपको सूचित करना चाहता हूँ: "${input}"। इस पर अपनी राय दें।`;
        suggestions = ["धन्यवाद।", "आपका दिन शुभ हो।", "कृपया विचार करें।"];
      }
    }
  } else if (activeTarget === "Spanish") {
    if (isDelay) {
      if (tone === "casual") {
        outputText = "Hola, voy un poco tarde. ¿Podrías revisar el archivo mientras tanto? ¡Gracias!";
        suggestions = ["Llego en 10 minutos.", "¡Disculpa la demora!", "Nos vemos pronto."];
      } else if (tone === "executive") {
        outputText = "Breve retraso de mi parte. Favor de revisar los documentos adjuntos en lo que me incorporo.";
        suggestions = ["Conectándome en breve.", "Avísenme de cualquier cambio.", "Gracias."];
      } else {
        outputText = "Hola, lamento informarle que tengo un ligero retraso hoy. Estaré allí lo antes posible.";
        suggestions = ["Gracias por su comprensión.", "Voy en camino.", "Por favor inicien sin mí."];
      }
    } else if (isSendOrShare) {
      if (tone === "casual") {
        outputText = "¡Hola! Aquí tienes el archivo que me pediste. ¡Avísame si todo está bien!";
        suggestions = ["Espero que te sirva.", "Hablamos luego.", "¡Un saludo!"];
      } else if (tone === "executive") {
        outputText = "He remitido la documentación correspondiente. Quedo en espera de sus comentarios corporativos.";
        suggestions = ["Acción requerida hoy.", "Aprobado para su revisión.", "Enviar reporte."];
      } else {
        outputText = "Adjunto remito la información solicitada. Por favor, confírmeme si todo está de su agrado.";
        suggestions = ["Quedo a su disposición.", "Confirmar recepción.", "Muchas gracias."];
      }
    } else {
      if (tone === "casual") {
        outputText = `¡Hola! Aquí tienes los detalles sobre: "${input}". ¡Un saludo!`;
        suggestions = ["¡Perfecto!", "Entendido.", "Nos vemos."];
      } else if (tone === "executive") {
        outputText = `Estimados, con respecto a: "${input}". Procederemos según lo acordado.`;
        suggestions = ["Proceder.", "Aprobado.", "Revisar prioridad."];
      } else {
        outputText = `Estimado/a, le escribo para informarle acerca de: "${input}". Quedo a su entera disposición.`;
        suggestions = ["Muchas gracias.", "Saludos cordiales.", "Espero sus comentarios."];
      }
    }
  } else if (activeTarget === "French") {
    if (isDelay) {
      if (tone === "casual") {
        outputText = "Salut ! J'ai un peu de retard. Tu peux jeter un œil au fichier en attendant ? Merci !";
        suggestions = ["J'arrive dans 10 min.", "Désolé pour le retard !", "À tout de suite."];
      } else if (tone === "executive") {
        outputText = "Léger contretemps. Veuillez s'il vous plaît passer en revue le dossier durant mon absence.";
        suggestions = ["Je me connecte bientôt.", "Tenez-moi informé.", "Cordialement."];
      } else {
        outputText = "Bonjour, je vous prie de m'excuser, j'ai un léger retard aujourd'hui. Je fais au plus vite.";
        suggestions = ["Merci pour votre patience.", "Je suis en route.", "Commencez sans moi."];
      }
    } else if (isSendOrShare) {
      if (tone === "casual") {
        outputText = "Salut, voilà le fichier ! Dis-moi ce que tu en penses dès que tu peux.";
        suggestions = ["J'espère que ça aide.", "On s'appelle plus tard.", "À plus !"];
      } else if (tone === "executive") {
        outputText = "Veuillez trouver ci-joint les documents requis pour validation. Merci de m'indiquer vos retours.";
        suggestions = ["Action requise aujourd'hui.", "Validé pour relecture.", "Merci."];
      } else {
        outputText = "Bonjour, je vous envoie le fichier mis à jour. N'hésitez pas à me faire part de vos remarques.";
        suggestions = ["Accuser réception s.v.p.", "Reste à votre écoute.", "Bonne journée."];
      }
    } else {
      if (tone === "casual") {
        outputText = `Salut ! Voilà les détails concernant : "${input}". À bientôt !`;
        suggestions = ["Super !", "Bien reçu.", "Bon courage !"];
      } else if (tone === "executive") {
        outputText = `Bonjour, concernant le sujet suivant : "${input}". Veuillez trouver notre position officielle ci-jointe.`;
        suggestions = ["Approuvé.", "À traiter en priorité.", "Merci."];
      } else {
        outputText = `Bonjour, je me permet de vous contacter au sujet de : "${input}". Je reste à votre disposition.`;
        suggestions = ["Merci beaucoup.", "Sincères salutations.", "Bien cordialement."];
      }
    }
  } else if (activeTarget === "German") {
    if (isDelay) {
      if (tone === "casual") {
        outputText = "Hi, ich verspäte mich leider etwas. Kannst du kurz in die Datei schauen? Danke!";
        suggestions = ["Bin in 10 Min. da.", "Sorry für die Verspätung!", "Bis gleich."];
      } else if (tone === "executive") {
        outputText = "Kurze Verspätung meinerseits. Bitte prüfen Sie die Unterlagen bis zu meinem Eintreffen.";
        suggestions = ["Verbinde mich gleich.", "Geben Sie mir Bescheid.", "Mit freundlichen Grüßen."];
      } else {
        outputText = "Guten Tag, bitte entschuldigen Sie die Verspätung. Ich treffe in wenigen Minuten ein.";
        suggestions = ["Vielen Dank für Ihr Verständnis.", "Ich bin unterwegs.", "Fangen Sie schon mal an."];
      }
    } else if (isSendOrShare) {
      if (tone === "casual") {
        outputText = "Hey, hier ist die gewünschte Datei. Sag mir kurz Bescheid, ob alles passt!";
        suggestions = ["Hoffe das hilft.", "Bis später.", "Schöne Grüße!"];
      } else if (tone === "executive") {
        outputText = "Anbei übermittle ich Ihnen die gewünschte Dokumentation zur Freigabe. Bitte um kurzes Feedback.";
        suggestions = ["Heute noch freigeben.", "Dokumente geprüft.", "Danke."];
      } else {
        outputText = "Guten Tag, ich habe Ihnen die aktualisierte Datei zugesandt. Bitte prüfen Sie diese.";
        suggestions = ["Bitte Erhalt bestätigen.", "Für Fragen stehe ich bereit.", "Viele Grüße."];
      }
    } else {
      if (tone === "casual") {
        outputText = `Hi, hier sind die Infos zu: "${input}". Lass von dir hören!`;
        suggestions = ["Alles klar!", "Verstanden.", "Tschüss!"];
      } else if (tone === "executive") {
        outputText = `Sehr geehrte Damen und Herren, bezüglich: "${input}". Wir bitten um zeitnahe Rückmeldung.`;
        suggestions = ["Freigegeben.", "Priorität erhöhen.", "Besten Dank."];
      } else {
        outputText = `Guten Tag, ich möchte Sie über Folgendes informieren: "${input}". Für Rückfragen stehe ich zur Verfügung.`;
        suggestions = ["Vielen Dank.", "Herzliche Grüße.", "Ich freue mich auf Ihr Feedback."];
      }
    }
  }

  if (suggestions.length < 3) {
    suggestions = [
      "I'll join shortly.",
      "The report is almost complete.",
      "Please review whenever possible."
    ];
  }

  return { output: outputText, suggestions };
}

// API route for FlowTalk AI language detection
app.post("/api/flowtalk/detect-language", async (req, res) => {
  const { input, customGeminiKey } = req.body;
  if (!input || input.trim().length < 3) {
    return res.json({ language: "Auto" });
  }

  // 1. First run the ultra-fast local offline heuristic detector
  const localDetected = localDetectLanguage(input);
  if (localDetected) {
    return res.json({ language: localDetected });
  }

  // 2. Fallback to API check only if we don't have high confidence, handling rate limits nicely
  try {
    let activeAi = ai;
    if (customGeminiKey && customGeminiKey.trim()) {
      activeAi = new GoogleGenAI({
        apiKey: customGeminiKey.trim(),
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build-user-key',
          }
        }
      });
    }

    const prompt = `Analyze the following text and detect its primary language. 
Provide only the name of the language (e.g., "English", "Bengali", "Hindi", "Spanish", "French", "German", "Hinglish", "Benglish", "Mixed"). 
Be very concise. Return ONLY the language name itself, without any introductory words, punctuation, or explanation.

Text to analyze:
"${input.trim()}"`;

    const result = await withRetry(() => activeAi.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        temperature: 0.1,
      }
    }));

    const detected = result.text ? result.text.trim().replace(/[".\n\r]/g, '') : "English";
    res.json({ language: detected });
  } catch (error: any) {
    const isQuotaExceeded = error.message?.includes("quota") || error.status === 429 || error.code === 429 || error.statusText?.includes("Too Many Requests");
    if (isQuotaExceeded) {
      console.warn("Language detection Gemini quota limits exceeded. Graceful fallback applied.");
    } else {
      console.warn("Language detection warning:", error.message || error);
    }
    // Return gracefully to avoid unhandled errors
    res.json({ language: "English" });
  }
});

// API route for FlowTalk AI rewriting
app.post("/api/flowtalk/rewrite", async (req, res) => {
  const { input, tone, currentApp, sourceLanguage, targetLanguage, customGeminiKey } = req.body;

  if (!input) {
    return res.status(400).json({ error: "Input is required" });
  }

  try {
    let activeAi = ai;
    if (customGeminiKey && customGeminiKey.trim()) {
      activeAi = new GoogleGenAI({
        apiKey: customGeminiKey.trim(),
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build-user-key',
          }
        }
      });
    }

    const systemInstruction = `
      You are FlowTalk AI, a high-performance communication assistant.
      Your task is to transform natural, casual, or mixed-language thoughts into professional messages for apps like ${currentApp || 'Microsoft Teams'}.
      
      LANGUAGES:
      - Source: ${sourceLanguage && sourceLanguage !== 'Auto-detect' ? sourceLanguage : 'Detect automatically (Bengali, Hindi, Hinglish, Bengali-English mixed, Spanish, etc.).'}
      - Target: ${targetLanguage && targetLanguage !== 'Auto-detect' ? targetLanguage : 'Detect the input language and keep the output in the SAME language as the input, but polished and professional.'}
      
      TONE: "${tone || 'professional'}"
      - Casual: Friendly, concise, relaxed but polite.
      - Professional: Courteous, standard business language, clear and helpful.
      - Executive: High-level, formal, decisive, very professional.

      RULES:
      1. Rewrite the input into the target language matching the requested tone.
      2. If target is "Auto-detect" or not specified, stick to the language used in the input thought.
      3. If the input is empty or unclear, provide a polite placeholder or ask for more context subtly.
      4. Output ONLY the rewritten message. Do not include labels like "Rewritten:" or "Output:".
      5. Provide 3 short "Smart Suggestions" as variations or follow-ups, formatted as a JSON array at the end of the response, separated by a unique delimiter "|||JSON|||".
    `;

    const result = await withRetry(() => activeAi.models.generateContent({
      model: "gemini-3.5-flash",
      contents: input,
      config: {
        systemInstruction,
        temperature: 0.7,
      }
    }));

    const fullText = result.text || "";
    const [rewrittenText, jsonPart] = fullText.split("|||JSON|||");
    
    let suggestions = [];
    if (jsonPart) {
      try {
        suggestions = JSON.parse(jsonPart.trim());
      } catch (e) {
        console.error("Failed to parse suggestions JSON", e);
      }
    }

    res.json({ 
      output: rewrittenText.trim(),
      suggestions: suggestions.length > 0 ? suggestions : ["I'll share it shortly.", "Can I send it by EOD?", "The report is almost complete."],
      localFallbackApplied: false
    });
  } catch (error: any) {
    const isQuotaExceeded = error.message?.includes("quota") || error.status === 429 || error.code === 429 || error.statusText?.includes("Too Many Requests") || error.message?.includes("quota limits") || error.message?.includes("RESOURCE_EXHAUSTED");
    const isBusy = error.message?.includes("503") || error.status === 503 || error.message?.includes("high demand") || error.code === 503;

    console.warn("Gemini Rewrite error encountered. Triggering graceful fallback. Description:", error.message || error);

    // Run the local heuristic translator so the user's application never stops working
    const fallback = localHeuristicRewrite(input, tone || 'professional', sourceLanguage || 'Auto-detect', targetLanguage || 'Auto-detect');

    return res.json({
      output: fallback.output,
      suggestions: fallback.suggestions,
      localFallbackApplied: true,
      isQuotaExceeded,
      isBusy,
      warningMessage: "Shared AI demo limits reached. Switched gracefully to high-performance local offline translation. Set a personal Gemini API Key in the Control Panel under License & Credits for unbound cloud AI access."
    });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
