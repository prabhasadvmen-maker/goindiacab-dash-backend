// Outstation (One Way / Round Trip) is served only in these places. A search result is accepted when it sits in one of them:
// the city itself, or any hotel / railway station / airport / landmark / address whose text names it.
// Format: 'City' or 'City|State' (state is checked only when the result text names a state). Aliases: 'City|State|alias1,alias2'.
const RAW = `
Agra|Uttar Pradesh|Taj Mahal,Taj Ganj
Ajmer|Rajasthan
Aligarh|Uttar Pradesh
Almora|Uttarakhand
Amritsar|Punjab
Ayodhya|Uttar Pradesh
Ambala|Haryana
Anandpur Sahib|Punjab
Abu Road|Rajasthan
Bahadurgarh|Haryana
Bareilly|Uttar Pradesh
Bharatpur|Rajasthan
Bhimtal|Uttarakhand
Bhiwani|Haryana
Bikaner|Rajasthan
Bilaspur|Himachal Pradesh
Bulandshahr|Uttar Pradesh
Budaun|Uttar Pradesh|Badaun
Chandigarh||Mohali Airport
Chamba|Himachal Pradesh
Chamba|Uttarakhand
Chittorgarh|Rajasthan|Chittaurgarh
Churu|Rajasthan
Corbett|Uttarakhand|Ramnagar,Jim Corbett
Delhi||New Delhi,IGI Airport,Indira Gandhi International
Dwarka|Delhi
Dehradun|Uttarakhand
Dharamshala|Himachal Pradesh|Dharamsala
Dhanaulti|Uttarakhand
Dausa|Rajasthan
Dholpur|Rajasthan
Etah|Uttar Pradesh
Etawah|Uttar Pradesh
Faridabad|Haryana
Fatehpur Sikri|Uttar Pradesh
Firozabad|Uttar Pradesh
Fatehabad|Haryana
Ghaziabad|Uttar Pradesh
Greater Noida|Uttar Pradesh
Gurugram|Haryana|Gurgaon
Ganganagar|Rajasthan|Sri Ganganagar
Govardhan|Uttar Pradesh
Gokul|Uttar Pradesh
Gaurikund|Uttarakhand
Gorakhpur|Uttar Pradesh
Haridwar|Uttarakhand
Haldwani|Uttarakhand
Hapur|Uttar Pradesh
Hisar|Haryana
Hamirpur|Himachal Pradesh
Hoshiarpur|Punjab
Hanumangarh|Rajasthan
Hathras|Uttar Pradesh
Indri|Haryana
Indergarh|Rajasthan
Jaipur|Rajasthan
Jalandhar|Punjab
Jammu|Jammu & Kashmir|Jammu and Kashmir
Jodhpur|Rajasthan
Jhansi|Uttar Pradesh
Jaisalmer|Rajasthan
Jibhi|Himachal Pradesh
Jind|Haryana
Jhunjhunu|Rajasthan|Jhunjhunun
Kanpur|Uttar Pradesh
Karnal|Haryana
Kasauli|Himachal Pradesh
Kasol|Himachal Pradesh
Katra|Jammu & Kashmir|Vaishno Devi
Kausani|Uttarakhand
Khatu Shyam|Rajasthan|Khatushyam
Kota|Rajasthan
Kurukshetra|Haryana
Kullu|Himachal Pradesh
Kufri|Himachal Pradesh
Lucknow|Uttar Pradesh
Ludhiana|Punjab
Lansdowne|Uttarakhand
Lakhimpur|Uttar Pradesh|Lakhimpur Kheri
Manali|Himachal Pradesh
Mathura|Uttar Pradesh
Meerut|Uttar Pradesh
Moradabad|Uttar Pradesh
Mussoorie|Uttarakhand|Mussorie
Mandi|Himachal Pradesh
Mukteshwar|Uttarakhand|Mukteswar
Mount Abu|Rajasthan
Mahendragarh|Haryana
Mahoba|Uttar Pradesh
McLeodganj|Himachal Pradesh|Mcleod Ganj,Mcleodganj
Nainital|Uttarakhand
Noida|Uttar Pradesh
Neemrana|Rajasthan
Nathdwara|Rajasthan
Nagaur|Rajasthan
Narkanda|Himachal Pradesh
Orai|Uttar Pradesh
Osian|Rajasthan|Osiyan
Pantnagar|Uttarakhand|Panthnagar,Pant Nagar,Panth Nagar
Panipat|Haryana
Patiala|Punjab
Pithoragarh|Uttarakhand
Pushkar|Rajasthan
Pratapgarh|Uttar Pradesh
Prayagraj|Uttar Pradesh|Allahabad
Pilibhit|Uttar Pradesh
Qadian|Punjab
Rishikesh|Uttarakhand
Roorkee|Uttarakhand
Rohtak|Haryana
Ranthambore|Rajasthan|Ranthambhore
Rajsamand|Rajasthan
Rewari|Haryana
Ranikhet|Uttarakhand
Rudrapur|Uttarakhand
Rampur|Uttar Pradesh
Shimla|Himachal Pradesh
Sonipat|Haryana|Sonepat
Saharanpur|Uttar Pradesh
Sikar|Rajasthan
Sirsa|Haryana
Solan|Himachal Pradesh
Sambhal|Uttar Pradesh
Sawai Madhopur|Rajasthan
Sitapur|Uttar Pradesh
Salasar|Rajasthan
Sattal|Uttarakhand
Tapovan|Uttarakhand
Tehri|Uttarakhand
Thanesar|Haryana
Tirthan Valley|Himachal Pradesh|Tirthan
Tonk|Rajasthan
Tundla|Uttar Pradesh
Udaipur|Rajasthan
Unnao|Uttar Pradesh
Varanasi|Uttar Pradesh|Banaras
Vrindavan|Uttar Pradesh
Yamunanagar|Haryana|Yamuna Nagar
`;

// States / UTs that can appear in a result's address, used to reject same-named towns in another state (e.g. Hamirpur UP vs HP).
const KNOWN_STATES = [
  'uttar pradesh', 'uttarakhand', 'himachal pradesh', 'punjab', 'haryana', 'rajasthan', 'jammu & kashmir', 'jammu and kashmir',
  'ladakh', 'madhya pradesh', 'bihar', 'gujarat', 'maharashtra', 'chhattisgarh', 'jharkhand', 'west bengal', 'odisha', 'delhi',
];

const norm = (s) => String(s || '').toLowerCase().replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, ' ').trim();
const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const AREAS = RAW.split('\n').map((l) => l.trim()).filter(Boolean).map((line) => {
  const [name, state = '', aliases = ''] = line.split('|');
  const names = [name, ...aliases.split(',')].map(norm).filter(Boolean);
  return { name, state: norm(state), rx: new RegExp(`(^| )(${names.map(escapeRegex).join('|')})( |$)`) };
});

const mentionedStates = (text) => KNOWN_STATES.map(norm).filter((s) => new RegExp(`(^| )${escapeRegex(s)}( |$)`).test(text));

// True when the text (a place's name + address) lies in one of the served places.
export const isServiceablePlace = (...parts) => {
  const text = norm(parts.filter(Boolean).join(' '));
  if (!text) return false;
  const states = mentionedStates(text);
  return AREAS.some((a) => {
    if (!a.rx.test(text)) return false;
    if (!a.state || states.length === 0) return true;
    return states.includes(a.state);
  });
};

export const SERVICE_UNAVAILABLE_MESSAGE = 'Service not available at this location. We are starting soon!';
