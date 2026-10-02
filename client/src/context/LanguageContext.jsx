import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { COMPANY_NAME } from "../config/appConfig";

const STORAGE_KEY = "yatrilog-language";

const translations = {
  "Home": "होम",
  "Search": "खोजें",
  "Bookings": "बुकिंग",
  "Tickets": "टिकट",
  "Trips": "यात्राएँ",
  "My Trips": "मेरी यात्राएँ",
  "Daily Bookings": "दैनिक बुकिंग",
  "Revenue": "राजस्व",
  "Dashboard": "डैशबोर्ड",
  "All Vans": "सभी वैन",
  "Routes & Stops": "रूट और स्टॉप",
  "Vehicles": "वाहन",
  "Drivers": "ड्राइवर",
  "Logout": "लॉग आउट",
  "User": "उपयोगकर्ता",
  "System Admin": "सिस्टम एडमिन",
  "Fleet Owner": "फ्लीट मालिक",
  "WORKSPACE": "वर्कस्पेस",
  "OWNER PORTAL": "मालिक पोर्टल",
  "ADMIN PORTAL": "एडमिन पोर्टल",
  "MY TRIPS": "मेरी यात्राएँ",
  "OPERATIONS": "ऑपरेशंस",
  "MANAGEMENT": "प्रबंधन",
  "Loading...": "लोड हो रहा है...",
  "Loading notifications...": "सूचनाएँ लोड हो रही हैं...",
  "No notifications yet.": "अभी कोई सूचना नहीं है।",
  "Notifications": "सूचनाएँ",
  "Mark all as read": "सभी को पढ़ा हुआ करें",
  "Available": "उपलब्ध",
  "Selected": "चयनित",
  "Booked": "बुक किया गया",
  "Locked": "लॉक किया गया",
  "FRONT": "सामने",
  "DRIVER": "ड्राइवर",
  "Date": "तारीख",
  "From": "से",
  "To": "तक",
  "Route": "रूट",
  "Van": "वैन",
  "Vehicle": "वाहन",
  "Fare": "किराया",
  "Status": "स्थिति",
  "Passenger": "यात्री",
  "Journey": "यात्रा",
  "Seat": "सीट",
  "Booking": "बुकिंग",
  "Total Revenue": "कुल राजस्व",
  "TOTAL REVENUE": "कुल राजस्व",
  "PAID BOOKINGS": "भुगतान की गई बुकिंग",
  "TRIPS": "यात्राएँ",
  "ROUTES": "रूट",
  "VEHICLES": "वाहन",
  "DRIVERS": "ड्राइवर",
  "Search Trips": "यात्राएँ खोजें",
  "Search Results": "खोज परिणाम",
  "Search": "खोजें",
  "Book Now": "अभी बुक करें",
  "View Details": "विवरण देखें",
  "View all →": "सभी देखें →",
  "View Revenue": "राजस्व देखें",
  "Manage": "प्रबंधित करें",
  "Save": "सहेजें",
  "Cancel": "रद्द करें",
  "Close": "बंद करें",
  "Edit": "संपादित करें",
  "Delete": "हटाएँ",
  "Add": "जोड़ें",
  "Update": "अपडेट करें",
  "Submit": "जमा करें",
  "Continue": "जारी रखें",
  "Confirm": "पुष्टि करें",
  "Back": "वापस",
  "Next": "आगे",
  "Login": "लॉगिन",
  "Sign Up": "साइन अप",
  "Signup": "साइन अप",
  "Email": "ईमेल",
  "Password": "पासवर्ड",
  "Confirm Password": "पासवर्ड की पुष्टि करें",
  "Forgot Password?": "पासवर्ड भूल गए?",
  "Reset Password": "पासवर्ड रीसेट करें",
  "Verify Email": "ईमेल सत्यापित करें",
  "Name": "नाम",
  "Phone": "फ़ोन",
  "Profile": "प्रोफ़ाइल",
  "Payment": "भुगतान",
  "My Bookings": "मेरी बुकिंग",
  "Booking History": "बुकिंग इतिहास",
  "No bookings found": "कोई बुकिंग नहीं मिली",
  "No bookings for this van": "इस वैन के लिए कोई बुकिंग नहीं है",
  "No vans found": "कोई वैन नहीं मिली",
  "Loading vans...": "वैन लोड हो रही हैं...",
  "Loading bookings...": "बुकिंग लोड हो रही हैं...",
  "Loading fare management...": "किराया प्रबंधन लोड हो रहा है...",
  "Trip not found": "यात्रा नहीं मिली",
  "No trips": "कोई यात्रा नहीं",
  "No trips were found for the selected filters.": "चयनित फ़िल्टर के लिए कोई यात्रा नहीं मिली।",
  "No fare combinations found": "किराए का कोई संयोजन नहीं मिला",
  "Your assigned vans will appear here.": "आपको सौंपी गई वैन यहाँ दिखाई देंगी।",
  "Trips linked to your vehicles": "आपके वाहनों से जुड़ी यात्राएँ",
  "Trips needing fare setup": "किराया सेटअप वाली यात्राएँ",
  "Scheduled or preparing": "निर्धारित या तैयारी में",
  "Owner workspace": "मालिक वर्कस्पेस",
  "Review trips assigned to your vehicles.": "अपने वाहनों को सौंपी गई यात्राओं की समीक्षा करें।",
  "See every booking and passenger detail for a day.": "किसी दिन की सभी बुकिंग और यात्री विवरण देखें।",
  "Open any van and view its bookings by date.": "किसी भी वैन को खोलकर तारीख के अनुसार उसकी बुकिंग देखें।",
  "Check daily revenue and revenue per van.": "दैनिक राजस्व और प्रति वैन राजस्व देखें।",
  "Your journey, made simple.": "आपकी यात्रा, अब आसान।",
  "Select language": "भाषा चुनें",
  "English": "अंग्रेज़ी",
  "Hindi": "हिंदी",
  "Language": "भाषा",
  "Settings": "सेटिंग्स",
  "All": "सभी",
  "Today": "आज",
  "Yesterday": "कल",
  "Tomorrow": "कल",
  "Revenue by van": "वैन के अनुसार राजस्व",
  "Revenue by trip": "यात्रा के अनुसार राजस्व",
  "BREAKDOWN": "विवरण",
  "TRIP BREAKDOWN": "यात्रा विवरण",
  "Confirmed bookings": "पुष्ट बुकिंग",
  "Confirmed paid bookings": "पुष्ट भुगतान वाली बुकिंग",
  "Confirmed and paid": "पुष्ट और भुगतान की गई",
  "For selected date": "चयनित तारीख के लिए",
  "Trips operated": "संचालित यात्राएँ",
  "Set segment fares from a trip's fare management screen.": "यात्रा के किराया प्रबंधन स्क्रीन से सेगमेंट किराया सेट करें।",
  "CANONICAL SEAT LAYOUT": "मानक सीट लेआउट",
  "This is the same layout configured for this van.": "यह इस वैन के लिए कॉन्फ़िगर किया गया वही लेआउट है।",
  "Booking records": "बुकिंग रिकॉर्ड",
  "Confirmed bookings": "पुष्ट बुकिंग",
  "Fare Management": "किराया प्रबंधन",
  "DATE": "तारीख",
  "VEHICLE": "वाहन",
  "STATUS": "स्थिति",
  "FROM": "से",
  "FARE": "किराया",
  "Seat Layout": "सीट लेआउट",
  "Seat Layout Designer": "सीट लेआउट डिज़ाइनर",
  "Save Layout": "लेआउट सहेजें",
  "Reset Layout": "लेआउट रीसेट करें",
  "Select Vehicle": "वाहन चुनें",
  "Number of Seats": "सीटों की संख्या",
  "Create Trip": "यात्रा बनाएँ",
  "New Booking": "नई बुकिंग",
  "Passengers": "यात्री",
  "Daily Bookings": "दैनिक बुकिंग",
  "No paid revenue": "कोई भुगतान किया हुआ राजस्व नहीं",
  "View all": "सभी देखें",
  "BOOK YOUR BUS": "अपनी बस बुक करें",
  "BOOKING CONFIRMED": "बुकिंग की पुष्टि हो गई",
  "BOOKING DATE": "बुकिंग की तारीख",
  "BOOKING NUMBER": "बुकिंग नंबर",
  "Booking Details": "बुकिंग विवरण",
  "Booking Successful": "बुकिंग सफल",
  "Booking completed": "बुकिंग पूरी हो गई",
  "Booking not found": "बुकिंग नहीं मिली",
  "Booking(s)": "बुकिंग",
  "Booking Confirmed": "बुकिंग की पुष्टि हो गई",
  "Cancellation Policy": "रद्दीकरण नीति",
  "Cancelled": "रद्द किया गया",
  "Cash": "नकद",
  "Choose your route and travel date to see available buses.": "उपलब्ध बसें देखने के लिए अपना रूट और यात्रा की तारीख चुनें।",
  "Create account": "खाता बनाएँ",
  "Create an account": "खाता बनाएँ",
  "Create a driver account to assign drivers to trips.": "यात्राओं के लिए ड्राइवर नियुक्त करने हेतु ड्राइवर खाता बनाएँ।",
  "Create a route": "रूट बनाएँ",
  "Create a stop": "स्टॉप बनाएँ",
  "Create a trip to make it available for operations.": "ऑपरेशंस के लिए उपलब्ध कराने हेतु यात्रा बनाएँ।",
  "Create your account and discover a simpler way to travel.": "अपना खाता बनाएँ और यात्रा का आसान तरीका खोजें।",
  "Create your first route to get started.": "शुरू करने के लिए अपना पहला रूट बनाएँ।",
  "Create your first stop to start building routes.": "रूट बनाना शुरू करने के लिए अपना पहला स्टॉप बनाएँ।",
  "Create your first stop using the Create Stop button.": "Create Stop बटन का उपयोग करके अपना पहला स्टॉप बनाएँ।",
  "Daily Bookings": "दैनिक बुकिंग",
  "Departure": "प्रस्थान",
  "DEPARTURE": "प्रस्थान",
  "Design Seats": "सीट डिज़ाइन करें",
  "Design each van with a responsive drag-and-drop canvas.": "हर वैन को responsive drag-and-drop canvas से डिज़ाइन करें।",
  "Design the actual van once. Every role will see this exact saved arrangement.": "वैन को एक बार डिज़ाइन करें। हर भूमिका को यही सहेजा हुआ लेआउट दिखाई देगा।",
  "Drag any seat anywhere inside the van.": "किसी भी सीट को वैन के अंदर कहीं भी खींचें।",
  "Dropping Stop": "उतरने का स्टॉप",
  "Boarding Stop": "चढ़ने का स्टॉप",
  "EMAIL VERIFICATION": "ईमेल सत्यापन",
  "EXISTING ROUTES": "मौजूदा रूट",
  "Email address": "ईमेल पता",
  "Enter your email and we will send you a secure reset link.": "अपना ईमेल दर्ज करें और हम आपको सुरक्षित रीसेट लिंक भेजेंगे।",
  "Fare / Seat": "किराया / सीट",
  "Fare per seat": "प्रति सीट किराया",
  "Filter by van": "वैन के अनुसार फ़िल्टर",
  "FILTER TICKETS": "टिकट फ़िल्टर करें",
  "Find a ticket quickly": "टिकट जल्दी खोजें",
  "Find buses, routes, and available seats.": "बसें, रूट और उपलब्ध सीटें खोजें।",
  "Find your next trip": "अपनी अगली यात्रा खोजें",
  "Fleet vehicles": "फ्लीट वाहन",
  "Forgot your password?": "पासवर्ड भूल गए?",
  "Full Name": "पूरा नाम",
  "Full name": "पूरा नाम",
  "GET STARTED": "शुरू करें",
  "GOING TO": "कहाँ जाना है",
  "Keep your fleet trips scheduled and fares ready for sale.": "अपनी फ्लीट यात्राएँ निर्धारित रखें और किराए बिक्री के लिए तैयार रखें।",
  "Loading drivers...": "ड्राइवर लोड हो रहे हैं...",
  "Loading passengers...": "यात्री लोड हो रहे हैं...",
  "Loading routes and stops...": "रूट और स्टॉप लोड हो रहे हैं...",
  "Loading seat availability...": "सीट उपलब्धता लोड हो रही है...",
  "Loading seat designer...": "सीट डिज़ाइनर लोड हो रहा है...",
  "Loading ticket...": "टिकट लोड हो रहा है...",
  "Loading trip details...": "यात्रा विवरण लोड हो रहा है...",
  "Loading trip...": "यात्रा लोड हो रही है...",
  "Loading trips...": "यात्राएँ लोड हो रही हैं...",
  "Loading vehicles...": "वाहन लोड हो रहे हैं...",
  "Loading your bookings...": "आपकी बुकिंग लोड हो रही हैं...",
  "Loading your trips...": "आपकी यात्राएँ लोड हो रही हैं...",
  "Login to manage your journeys and bookings.": "अपनी यात्राएँ और बुकिंग प्रबंधित करने के लिए लॉगिन करें।",
  "Manage buses and their seating configuration.": "बसों और उनके सीट कॉन्फ़िगरेशन को प्रबंधित करें।",
  "Manage routes, boarding stops and dropping stops.": "रूट, चढ़ने और उतरने के स्टॉप प्रबंधित करें।",
  "Manage the complete journey from route creation to booking.": "रूट बनाने से लेकर बुकिंग तक पूरी यात्रा प्रबंधित करें।",
  "Manage the stops and routes used by your buses.": "अपनी बसों द्वारा उपयोग किए जाने वाले स्टॉप और रूट प्रबंधित करें।",
  "Manage your assigned trips and passenger information.": "अपनी सौंपी गई यात्राएँ और यात्री जानकारी प्रबंधित करें।",
  "Manage your drivers and their account status.": "अपने ड्राइवर और उनके खाते की स्थिति प्रबंधित करें।",
  "Manage your journey": "अपनी यात्रा प्रबंधित करें",
  "Manage your trips and configure journey fares.": "अपनी यात्राएँ प्रबंधित करें और यात्रा किराया कॉन्फ़िगर करें।",
  "My Assigned Trips": "मेरी सौंपी गई यात्राएँ",
  "My Bookings": "मेरी बुकिंग",
  "NEW ROUTE": "नया रूट",
  "NEW STOP": "नया स्टॉप",
  "New Booking": "नई बुकिंग",
  "New Passenger Booking": "नई यात्री बुकिंग",
  "New password": "नया पासवर्ड",
  "No bookings for this day": "इस दिन के लिए कोई बुकिंग नहीं है",
  "No bookings for this van": "इस वैन के लिए कोई बुकिंग नहीं है",
  "No bookings yet": "अभी कोई बुकिंग नहीं है",
  "No confirmed passengers": "कोई पुष्ट यात्री नहीं",
  "No drivers yet": "अभी कोई ड्राइवर नहीं है",
  "No routes created": "कोई रूट नहीं बनाया गया",
  "No seats found for this vehicle.": "इस वाहन के लिए कोई सीट नहीं मिली।",
  "No seats reserved": "कोई सीट आरक्षित नहीं है",
  "No stops available": "कोई स्टॉप उपलब्ध नहीं है",
  "No stops created": "कोई स्टॉप नहीं बनाया गया",
  "No tickets match your filters": "आपके फ़िल्टर से कोई टिकट मेल नहीं खाता",
  "No trips assigned": "कोई यात्रा सौंपी नहीं गई",
  "No trips found": "कोई यात्रा नहीं मिली",
  "No trips scheduled": "कोई यात्रा निर्धारित नहीं है",
  "No vans match this filter": "इस फ़िल्टर से कोई वैन मेल नहीं खाती",
  "No vehicles yet": "अभी कोई वाहन नहीं है",
  "Number of seats": "सीटों की संख्या",
  "OFFLINE BOOKING": "ऑफलाइन बुकिंग",
  "PAID REVENUE": "भुगतान किया गया राजस्व",
  "PASSENGER": "यात्री",
  "PASSENGER ACCESS": "यात्री एक्सेस",
  "PASSENGER MANIFEST": "यात्री सूची",
  "PASSWORD RECOVERY": "पासवर्ड रिकवरी",
  "PAYMENT": "भुगतान",
  "PAYMENT STATUS": "भुगतान स्थिति",
  "PAYMENT SUCCESSFUL": "भुगतान सफल",
  "PLAN A TRIP": "यात्रा की योजना बनाएँ",
  "PLAN YOUR JOURNEY": "अपनी यात्रा की योजना बनाएँ",
  "Paid bookings": "भुगतान की गई बुकिंग",
  "Passenger Details": "यात्री विवरण",
  "Passengers will appear here after successful booking.": "सफल बुकिंग के बाद यात्री यहाँ दिखाई देंगे।",
  "Payment Method": "भुगतान का तरीका",
  "Payment information unavailable": "भुगतान की जानकारी उपलब्ध नहीं है",
  "Pending": "लंबित",
  "Phone number": "फ़ोन नंबर",
  "Please select your seats again.": "कृपया अपनी सीटें फिर से चुनें।",
  "QUICK ACCESS": "त्वरित एक्सेस",
  "REFUNDED": "रिफंड किया गया",
  "ROLE": "भूमिका",
  "ROUTE": "रूट",
  "ROUTE SCHEDULE": "रूट शेड्यूल",
  "ROUTES": "रूट",
  "Registered drivers": "पंजीकृत ड्राइवर",
  "Reserving your seats...": "आपकी सीटें आरक्षित की जा रही हैं...",
  "Reset password": "पासवर्ड रीसेट करें",
  "Select Vehicle": "वाहन चुनें",
  "Select language": "भाषा चुनें",
  "Already have an account?": "क्या आपका पहले से खाता है?",
  "Don't have an account?": "क्या आपका खाता नहीं है?",
  "Back to login": "लॉगिन पर वापस जाएँ",
  "Didn't receive the code?": "कोड नहीं मिला?",
  "Confirm password": "पासवर्ड की पुष्टि करें",
  "Administrator": "प्रशासक",
  "Driver": "ड्राइवर",
  "Owner": "मालिक",
  "Agent": "एजेंट",
  "Driver / Agent": "ड्राइवर / एजेंट",
  "AGENT / Driver": "एजेंट / ड्राइवर",
  "DRIVER DASHBOARD": "ड्राइवर डैशबोर्ड",
  "DRIVER PORTAL": "ड्राइवर पोर्टल",
  "FLEET": "फ्लीट",
  "AVAILABLE LOCATIONS": "उपलब्ध स्थान",
  "AVAILABLE TRIPS": "उपलब्ध यात्राएँ",
  "BOARDING": "चढ़ना",
  "BOARDING FROM": "चढ़ने का स्थान",
  "DROPPING": "उतरना",
  "ARRIVAL": "आगमन",
  "JOURNEY": "यात्रा",
  "ORIGINAL TOTAL": "मूल कुल",
  "CONFIRMED": "पुष्ट",
  "ACTIVE FARE": "सक्रिय किराया",
  "FARE PENDING": "किराया लंबित",
  "2 × 1": "2 × 1",
  "2 × 2": "2 × 2",
  "3 × 2": "3 × 2",
  "6 digits": "6 अंक",
  "AC Bus": "AC बस",
  "Non-AC Bus": "नॉन-AC बस",
  "Bus": "बस",
  "Electric Bus": "इलेक्ट्रिक बस",
  "All Drivers": "सभी ड्राइवर",
  "All Trips": "सभी यात्राएँ",
  "All Vehicles": "सभी वाहन",
  "All booking records": "सभी बुकिंग रिकॉर्ड",
  "All buses": "सभी बसें",
  "All routes": "सभी रूट",
  "All statuses": "सभी स्थितियाँ",
  "All vans": "सभी वैन",
  "OPTIONAL": "वैकल्पिक",
  "AISLE": "गलियारा",
};

const translate = (value, language) => {
  if (typeof value !== "string") return value;
  const normalized = value.replace(/\s+/g, " ").trim();
  if (language === "en") return normalized === "Yatrilog.com" ? COMPANY_NAME : value;
  if (normalized === "Loading Yatrilog.com") return `${COMPANY_NAME} लोड हो रहा है`;
  if (normalized === "Join Yatrilog.com and start booking your journeys.") {
    return `${COMPANY_NAME} से जुड़ें और अपनी यात्राएँ बुक करना शुरू करें।`;
  }
  if (normalized === "Yatrilog.com") return COMPANY_NAME;
  return translations[normalized] || value;
};

const LanguageContext = createContext(null);

export const LanguageProvider = ({ children }) => {
  const [language, setLanguageState] = useState(() => localStorage.getItem(STORAGE_KEY) || "en");
  const languageRef = useRef(language);
  const originalTextNodes = useRef(new WeakMap());

  const setLanguage = useCallback((next) => {
    const value = next === "hi" ? "hi" : "en";
    languageRef.current = value;
    setLanguageState(value);
    localStorage.setItem(STORAGE_KEY, value);
    document.documentElement.lang = value === "hi" ? "hi-IN" : "en-IN";
  }, []);

  const translateDocument = useCallback(() => {
    const root = document.body;
    if (!root) return;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);

    nodes.forEach((node) => {
      const parent = node.parentElement;
      if (!parent || ["SCRIPT", "STYLE", "NOSCRIPT"].includes(parent.tagName)) return;
      if (parent.closest(".language-toggle")) return;
      const original = originalTextNodes.current.get(node) ?? node.nodeValue;
      originalTextNodes.current.set(node, original);
      const leading = original.match(/^\s*/)?.[0] || "";
      const trailing = original.match(/\s*$/)?.[0] || "";
      const core = original.trim();
      if (!core) return;
      const result = translate(core, languageRef.current);
      const translatedValue = `${leading}${result}${trailing}`;
      if (node.nodeValue !== translatedValue) node.nodeValue = translatedValue;
    });

    root.querySelectorAll("input[placeholder], textarea[placeholder], [aria-label], [title]").forEach((element) => {
      ["placeholder", "aria-label", "title"].forEach((attribute) => {
        if (!element.hasAttribute(attribute)) return;
        const originalKey = `yatrilogOriginal${attribute
          .split("-")
          .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
          .join("")}`;
        const original = element.dataset[originalKey] ?? element.getAttribute(attribute);
        element.dataset[originalKey] = original;
        const translatedValue = translate(original, languageRef.current);
        if (element.getAttribute(attribute) !== translatedValue) {
          element.setAttribute(attribute, translatedValue);
        }
      });
    });
  }, []);

  useEffect(() => {
    document.documentElement.lang = language === "hi" ? "hi-IN" : "en-IN";
    const observer = new MutationObserver(() => window.requestAnimationFrame(translateDocument));
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
    translateDocument();
    return () => observer.disconnect();
  }, [language, translateDocument]);

  const value = useMemo(() => ({
    language,
    setLanguage,
    t: (value) => translate(value, language),
  }), [language, setLanguage]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) throw new Error("useLanguage must be used inside LanguageProvider");
  return context;
};
