/**
 * Offline gazetteer for headline-level geocoding.
 *
 * Why this exists: geocoding every headline through Nominatim is slow and
 * rate-limited. Instead we match place names that are explicitly written in
 * the headline / summary against a curated list of cities and countries.
 *
 * Honesty rules:
 *  - We never use the publisher's country to place a story.
 *  - If no place is mentioned, the article stays unlocated (lat/lon null).
 *  - Country matches are marked `country` precision, city matches `city`.
 */

const CITIES = []

function city(
  name,
  cc,
  country,
  lat,
  lon,
  aliases = [],
) {
  CITIES.push({
    type: 'city',
    name,
    cc,
    country,
    lat,
    lon,
    aliases: [name, ...aliases],
  })
}

/* ------------------------------------------------------------------ */
/* North America                                                       */
/* ------------------------------------------------------------------ */

city('New York', 'us', 'United States', 40.7128, -74.006, ['New York City', 'NYC', 'Wall Street', 'Manhattan'])
city('Los Angeles', 'us', 'United States', 34.0522, -118.2437, ['LA'])
city('Chicago', 'us', 'United States', 41.8781, -87.6298)
city('Washington', 'us', 'United States', 38.9072, -77.0369, ['Washington DC', 'Washington, D.C.', 'White House', 'Pentagon', 'Capitol Hill'])
city('Boston', 'us', 'United States', 42.3601, -71.0589)
city('San Francisco', 'us', 'United States', 37.7749, -122.4194, ['Silicon Valley', 'Bay Area'])
city('Seattle', 'us', 'United States', 47.6062, -122.3321)
city('Miami', 'us', 'United States', 25.7617, -80.1918)
city('Houston', 'us', 'United States', 29.7604, -95.3698)
city('Atlanta', 'us', 'United States', 33.749, -84.388)
city('Denver', 'us', 'United States', 39.7392, -104.9903)
city('Las Vegas', 'us', 'United States', 36.1699, -115.1398)
city('Honolulu', 'us', 'United States', 21.3069, -157.8583)
city('Toronto', 'ca', 'Canada', 43.6532, -79.3832)
city('Vancouver', 'ca', 'Canada', 49.2827, -123.1207)
city('Montreal', 'ca', 'Canada', 45.5017, -73.5673)
city('Ottawa', 'ca', 'Canada', 45.4215, -75.6972)
city('Calgary', 'ca', 'Canada', 51.0447, -114.0719)
city('Mexico City', 'mx', 'Mexico', 19.4326, -99.1332)
city('Guadalajara', 'mx', 'Mexico', 20.6597, -103.3496)
city('Monterrey', 'mx', 'Mexico', 25.6866, -100.3161)
city('Tijuana', 'mx', 'Mexico', 32.5149, -117.0382)
city('Havana', 'cu', 'Cuba', 23.1136, -82.3666)
city('Port-au-Prince', 'ht', 'Haiti', 18.5944, -72.3074)
city('Kingston', 'jm', 'Jamaica', 17.9714, -76.7931)
city('Panama City', 'pa', 'Panama', 8.9824, -79.5199)
city('Guatemala City', 'gt', 'Guatemala', 14.6349, -90.5069)
city('San Salvador', 'sv', 'El Salvador', 13.6929, -89.2182)
city('Tegucigalpa', 'hn', 'Honduras', 14.0723, -87.1921)
city('Managua', 'ni', 'Nicaragua', 12.1149, -86.2362)
city('Santo Domingo', 'do', 'Dominican Republic', 18.4861, -69.9312)
city('San Juan', 'pr', 'Puerto Rico', 18.4655, -66.1057)
city('Port of Spain', 'tt', 'Trinidad and Tobago', 10.6549, -61.5019)
city('Nassau', 'bs', 'Bahamas', 25.0443, -77.3504)

/* ------------------------------------------------------------------ */
/* South America                                                       */
/* ------------------------------------------------------------------ */

city('Sao Paulo', 'br', 'Brazil', -23.5505, -46.6333, ['São Paulo'])
city('Rio de Janeiro', 'br', 'Brazil', -22.9068, -43.1729, ['Rio'])
city('Brasilia', 'br', 'Brazil', -15.8267, -47.9218, ['Brasília'])
city('Buenos Aires', 'ar', 'Argentina', -34.6037, -58.3816)
city('Santiago', 'cl', 'Chile', -33.4489, -70.6693)
city('Lima', 'pe', 'Peru', -12.0464, -77.0428)
city('Bogota', 'co', 'Colombia', 4.711, -74.0721, ['Bogotá'])
city('Medellin', 'co', 'Colombia', 6.2442, -75.5812, ['Medellín'])
city('Caracas', 've', 'Venezuela', 10.4806, -66.9036)
city('Quito', 'ec', 'Ecuador', -0.1807, -78.4678)
city('Guayaquil', 'ec', 'Ecuador', -2.1709, -79.9224)
city('La Paz', 'bo', 'Bolivia', -16.4897, -68.1193)
city('Montevideo', 'uy', 'Uruguay', -34.9011, -56.1645)
city('Asuncion', 'py', 'Paraguay', -25.2637, -57.5759, ['Asunción'])
city('Georgetown', 'gy', 'Guyana', 6.8013, -58.1551)
city('Paramaribo', 'sr', 'Suriname', 5.852, -55.2038)

/* ------------------------------------------------------------------ */
/* Europe                                                              */
/* ------------------------------------------------------------------ */

city('London', 'gb', 'United Kingdom', 51.5074, -0.1278, ['Westminster', 'Downing Street'])
city('Manchester', 'gb', 'United Kingdom', 53.4808, -2.2426)
city('Birmingham', 'gb', 'United Kingdom', 52.4862, -1.8904)
city('Glasgow', 'gb', 'United Kingdom', 55.8642, -4.2518)
city('Edinburgh', 'gb', 'United Kingdom', 55.9533, -3.1883)
city('Belfast', 'gb', 'United Kingdom', 54.5973, -5.9301)
city('Cardiff', 'gb', 'United Kingdom', 51.4816, -3.1791)
city('Dublin', 'ie', 'Ireland', 53.3498, -6.2603)
city('Paris', 'fr', 'France', 48.8566, 2.3522)
city('Marseille', 'fr', 'France', 43.2965, 5.3698)
city('Lyon', 'fr', 'France', 45.764, 4.8357)
city('Berlin', 'de', 'Germany', 52.52, 13.405)
city('Munich', 'de', 'Germany', 48.1351, 11.582)
city('Frankfurt', 'de', 'Germany', 50.1109, 8.6821)
city('Hamburg', 'de', 'Germany', 53.5511, 9.9937)
city('Cologne', 'de', 'Germany', 50.9375, 6.9603)
city('Madrid', 'es', 'Spain', 40.4168, -3.7038)
city('Barcelona', 'es', 'Spain', 41.3874, 2.1686)
city('Valencia', 'es', 'Spain', 39.4699, -0.3763)
city('Seville', 'es', 'Spain', 37.3891, -5.9845)
city('Rome', 'it', 'Italy', 41.9028, 12.4964)
city('Milan', 'it', 'Italy', 45.4642, 9.19)
city('Naples', 'it', 'Italy', 40.8518, 14.2681)
city('Turin', 'it', 'Italy', 45.0703, 7.6869)
city('Amsterdam', 'nl', 'Netherlands', 52.3676, 4.9041)
city('Rotterdam', 'nl', 'Netherlands', 51.9244, 4.4777)
city('The Hague', 'nl', 'Netherlands', 52.0705, 4.3007, ['Hague'])
city('Brussels', 'be', 'Belgium', 50.8503, 4.3517)
city('Antwerp', 'be', 'Belgium', 51.2194, 4.4025)
city('Vienna', 'at', 'Austria', 48.2082, 16.3738)
city('Zurich', 'ch', 'Switzerland', 47.3769, 8.5417)
city('Geneva', 'ch', 'Switzerland', 46.2044, 6.1432)
city('Bern', 'ch', 'Switzerland', 46.948, 7.4474)
city('Stockholm', 'se', 'Sweden', 59.3293, 18.0686)
city('Gothenburg', 'se', 'Sweden', 57.7089, 11.9746)
city('Oslo', 'no', 'Norway', 59.9139, 10.7522)
city('Copenhagen', 'dk', 'Denmark', 55.6761, 12.5683)
city('Helsinki', 'fi', 'Finland', 60.1699, 24.9384)
city('Reykjavik', 'is', 'Iceland', 64.1466, -21.9426, ['Reykjavík'])
city('Warsaw', 'pl', 'Poland', 52.2297, 21.0122)
city('Krakow', 'pl', 'Poland', 50.0647, 19.945, ['Kraków'])
city('Prague', 'cz', 'Czech Republic', 50.0755, 14.4378)
city('Budapest', 'hu', 'Hungary', 47.4979, 19.0402)
city('Bucharest', 'ro', 'Romania', 44.4268, 26.1025)
city('Sofia', 'bg', 'Bulgaria', 42.6977, 23.3219)
city('Belgrade', 'rs', 'Serbia', 44.7866, 20.4489)
city('Zagreb', 'hr', 'Croatia', 45.815, 15.9819)
city('Sarajevo', 'ba', 'Bosnia and Herzegovina', 43.8563, 18.4131)
city('Ljubljana', 'si', 'Slovenia', 46.0569, 14.5058)
city('Skopje', 'mk', 'North Macedonia', 41.9973, 21.428)
city('Tirana', 'al', 'Albania', 41.3275, 19.8187)
city('Pristina', 'xk', 'Kosovo', 42.6629, 21.1655)
city('Athens', 'gr', 'Greece', 37.9838, 23.7275)
city('Thessaloniki', 'gr', 'Greece', 40.6401, 22.9444)
city('Istanbul', 'tr', 'Turkey', 41.0082, 28.9784)
city('Ankara', 'tr', 'Turkey', 39.9334, 32.8597)
city('Izmir', 'tr', 'Turkey', 38.4237, 27.1428)
city('Lisbon', 'pt', 'Portugal', 38.7223, -9.1393)
city('Porto', 'pt', 'Portugal', 41.1579, -8.6291)
city('Kyiv', 'ua', 'Ukraine', 50.4501, 30.5234, ['Kiev'])
city('Kharkiv', 'ua', 'Ukraine', 49.9935, 36.2304, ['Kharkov'])
city('Odesa', 'ua', 'Ukraine', 46.4825, 30.7233, ['Odessa'])
city('Mariupol', 'ua', 'Ukraine', 47.0971, 37.5434)
city('Donetsk', 'ua', 'Ukraine', 48.0159, 37.8029, ['Donbas', 'Donbass'])
city('Luhansk', 'ua', 'Ukraine', 48.574, 39.3078, ['Lugansk'])
city('Zaporizhzhia', 'ua', 'Ukraine', 47.8388, 35.1396)
city('Kherson', 'ua', 'Ukraine', 46.6354, 32.6169)
city('Dnipro', 'ua', 'Ukraine', 48.4647, 35.0462)
city('Lviv', 'ua', 'Ukraine', 49.8397, 24.0297)
city('Simferopol', 'ua', 'Ukraine', 44.9521, 34.1024, ['Crimea'])
city('Moscow', 'ru', 'Russia', 55.7558, 37.6173, ['Kremlin'])
city('Saint Petersburg', 'ru', 'Russia', 59.9311, 30.3609, ['St Petersburg', 'St. Petersburg'])
city('Novosibirsk', 'ru', 'Russia', 55.0084, 82.9357)
city('Minsk', 'by', 'Belarus', 53.9006, 27.559)
city('Chisinau', 'md', 'Moldova', 47.0105, 28.8638)
city('Tbilisi', 'ge', 'Georgia', 41.7151, 44.8271)
city('Yerevan', 'am', 'Armenia', 40.1792, 44.4991)
city('Baku', 'az', 'Azerbaijan', 40.4093, 49.8671)
city('Valletta', 'mt', 'Malta', 35.8989, 14.5146)
city('Nicosia', 'cy', 'Cyprus', 35.1856, 33.3823)
city('Riga', 'lv', 'Latvia', 56.9496, 24.1052)
city('Vilnius', 'lt', 'Lithuania', 54.6872, 25.2797)
city('Tallinn', 'ee', 'Estonia', 59.437, 24.7536)
city('Bratislava', 'sk', 'Slovakia', 48.1486, 17.1077)
city('Monaco', 'mc', 'Monaco', 43.7384, 7.4246)
city('Luxembourg', 'lu', 'Luxembourg', 49.6116, 6.1319)
city('Podgorica', 'me', 'Montenegro', 42.4304, 19.2594)

/* ------------------------------------------------------------------ */
/* Middle East                                                         */
/* ------------------------------------------------------------------ */

city('Jerusalem', 'il', 'Israel', 31.7683, 35.2137)
city('Tel Aviv', 'il', 'Israel', 32.0853, 34.7818)
city('Haifa', 'il', 'Israel', 32.794, 34.9896)
city('Gaza', 'ps', 'Palestine', 31.5017, 34.4668, ['Gaza City', 'Gaza Strip'])
city('Rafah', 'ps', 'Palestine', 31.2968, 34.2458)
city('Khan Younis', 'ps', 'Palestine', 31.3462, 34.3026)
city('Ramallah', 'ps', 'Palestine', 31.9038, 35.2034, ['West Bank'])
city('Jenin', 'ps', 'Palestine', 32.4615, 35.3)
city('Nablus', 'ps', 'Palestine', 32.2211, 35.2544)
city('Hebron', 'ps', 'Palestine', 31.5326, 35.0998)
city('Beirut', 'lb', 'Lebanon', 33.8938, 35.5018)
city('Damascus', 'sy', 'Syria', 33.5138, 36.2765)
city('Aleppo', 'sy', 'Syria', 36.2021, 37.1343)
city('Homs', 'sy', 'Syria', 34.7324, 36.7137)
city('Baghdad', 'iq', 'Iraq', 33.3152, 44.3661)
city('Erbil', 'iq', 'Iraq', 36.1911, 44.0092)
city('Mosul', 'iq', 'Iraq', 36.335, 43.1189)
city('Basra', 'iq', 'Iraq', 30.5085, 47.7804)
city('Tehran', 'ir', 'Iran', 35.6892, 51.389)
city('Isfahan', 'ir', 'Iran', 32.6546, 51.668)
city('Tabriz', 'ir', 'Iran', 38.0804, 46.2919)
city('Riyadh', 'sa', 'Saudi Arabia', 24.7136, 46.6753)
city('Jeddah', 'sa', 'Saudi Arabia', 21.4858, 39.1925)
city('Dubai', 'ae', 'United Arab Emirates', 25.2048, 55.2708)
city('Abu Dhabi', 'ae', 'United Arab Emirates', 24.4539, 54.3773)
city('Doha', 'qa', 'Qatar', 25.2854, 51.531)
city('Kuwait City', 'kw', 'Kuwait', 29.3759, 47.9774)
city('Manama', 'bh', 'Bahrain', 26.2285, 50.586)
city('Muscat', 'om', 'Oman', 23.588, 58.3829)
city('Sanaa', 'ye', 'Yemen', 15.3694, 44.191, ["Sana'a"])
city('Aden', 'ye', 'Yemen', 12.7855, 45.0187)
city('Hodeidah', 'ye', 'Yemen', 14.7978, 42.9545)
city('Amman', 'jo', 'Jordan', 31.9454, 35.9284)
city('Cairo', 'eg', 'Egypt', 30.0444, 31.2357)
city('Alexandria', 'eg', 'Egypt', 31.2001, 29.9187)
city('Khartoum', 'sd', 'Sudan', 15.5007, 32.5599)
city('Omdurman', 'sd', 'Sudan', 15.6445, 32.4777)
city('Port Sudan', 'sd', 'Sudan', 19.6158, 37.2164)
city('El Fasher', 'sd', 'Sudan', 13.627, 25.3493)
city('Tripoli', 'ly', 'Libya', 32.8872, 13.1913)
city('Benghazi', 'ly', 'Libya', 32.1167, 20.0667)
city('Tunis', 'tn', 'Tunisia', 36.8065, 10.1815)
city('Algiers', 'dz', 'Algeria', 36.7538, 3.0588)
city('Rabat', 'ma', 'Morocco', 34.0209, -6.8416)
city('Casablanca', 'ma', 'Morocco', 33.5731, -7.5898)

/* ------------------------------------------------------------------ */
/* Africa                                                              */
/* ------------------------------------------------------------------ */

city('Lagos', 'ng', 'Nigeria', 6.5244, 3.3792)
city('Abuja', 'ng', 'Nigeria', 9.0765, 7.3986)
city('Kano', 'ng', 'Nigeria', 12.0022, 8.592)
city('Accra', 'gh', 'Ghana', 5.6037, -0.187)
city('Abidjan', 'ci', "Cote d'Ivoire", 5.36, -4.0083)
city('Dakar', 'sn', 'Senegal', 14.7167, -17.4677)
city('Bamako', 'ml', 'Mali', 12.6392, -8.0029)
city('Ouagadougou', 'bf', 'Burkina Faso', 12.3714, -1.5197)
city('Niamey', 'ne', 'Niger', 13.5116, 2.1254)
city("N'Djamena", 'td', 'Chad', 12.1348, 15.0557)
city('Kinshasa', 'cd', 'Democratic Republic of the Congo', -4.4419, 15.2663)
city('Goma', 'cd', 'Democratic Republic of the Congo', -1.6771, 29.2289)
city('Lubumbashi', 'cd', 'Democratic Republic of the Congo', -11.6876, 27.5026)
city('Brazzaville', 'cg', 'Republic of the Congo', -4.2634, 15.2429)
city('Nairobi', 'ke', 'Kenya', -1.2921, 36.8219)
city('Mombasa', 'ke', 'Kenya', -4.0435, 39.6682)
city('Addis Ababa', 'et', 'Ethiopia', 9.03, 38.74)
city('Asmara', 'er', 'Eritrea', 15.3229, 38.9251)
city('Djibouti', 'dj', 'Djibouti', 11.5721, 43.1456)
city('Mogadishu', 'so', 'Somalia', 2.0469, 45.3182)
city('Kampala', 'ug', 'Uganda', 0.3476, 32.5825)
city('Kigali', 'rw', 'Rwanda', -1.9441, 30.0619)
city('Bujumbura', 'bi', 'Burundi', -3.3614, 29.3599)
city('Dar es Salaam', 'tz', 'Tanzania', -6.7924, 39.2083)
city('Dodoma', 'tz', 'Tanzania', -6.163, 35.7516)
city('Lusaka', 'zm', 'Zambia', -15.3875, 28.3228)
city('Harare', 'zw', 'Zimbabwe', -17.8252, 31.0335)
city('Maputo', 'mz', 'Mozambique', -25.9692, 32.5732)
city('Cabo Delgado', 'mz', 'Mozambique', -12.3333, 39.3333)
city('Johannesburg', 'za', 'South Africa', -26.2041, 28.0473)
city('Cape Town', 'za', 'South Africa', -33.9249, 18.4241)
city('Pretoria', 'za', 'South Africa', -25.7479, 28.2293)
city('Durban', 'za', 'South Africa', -29.8587, 31.0218)
city('Luanda', 'ao', 'Angola', -8.839, 13.2894)
city('Yaounde', 'cm', 'Cameroon', 3.848, 11.5021, ['Yaoundé'])
city('Libreville', 'ga', 'Gabon', 0.4162, 9.4673)
city('Malabo', 'gq', 'Equatorial Guinea', 3.7504, 8.7371)
city('Cotonou', 'bj', 'Benin', 6.3703, 2.3912)
city('Lome', 'tg', 'Togo', 6.1256, 1.2254, ['Lomé'])
city('Freetown', 'sl', 'Sierra Leone', 8.4657, -13.2317)
city('Monrovia', 'lr', 'Liberia', 6.3004, -10.7969)
city('Conakry', 'gn', 'Guinea', 9.6412, -13.5784)
city('Banjul', 'gm', 'Gambia', 13.4549, -16.579)
city('Bissau', 'gw', 'Guinea-Bissau', 11.8817, -15.6178)
city('Nouakchott', 'mr', 'Mauritania', 18.0735, -15.9582)
city('Antananarivo', 'mg', 'Madagascar', -18.8792, 47.5079)
city('Port Louis', 'mu', 'Mauritius', -20.1609, 57.5012)
city('Windhoek', 'na', 'Namibia', -22.5609, 17.0658)
city('Gaborone', 'bw', 'Botswana', -24.6282, 25.9231)
city('Maseru', 'ls', 'Lesotho', -29.3151, 27.4869)
city('Mbabane', 'sz', 'Eswatini', -26.3054, 31.1367)

/* ------------------------------------------------------------------ */
/* Asia                                                                */
/* ------------------------------------------------------------------ */

city('Tokyo', 'jp', 'Japan', 35.6762, 139.6503)
city('Osaka', 'jp', 'Japan', 34.6937, 135.5023)
city('Kyoto', 'jp', 'Japan', 35.0116, 135.7681)
city('Hiroshima', 'jp', 'Japan', 34.3853, 132.4553)
city('Seoul', 'kr', 'South Korea', 37.5665, 126.978)
city('Busan', 'kr', 'South Korea', 35.1796, 129.0756)
city('Pyongyang', 'kp', 'North Korea', 39.0392, 125.7625)
city('Beijing', 'cn', 'China', 39.9042, 116.4074)
city('Shanghai', 'cn', 'China', 31.2304, 121.4737)
city('Shenzhen', 'cn', 'China', 22.5431, 114.0579)
city('Guangzhou', 'cn', 'China', 23.1291, 113.2644)
city('Chengdu', 'cn', 'China', 30.5728, 104.0668)
city('Wuhan', 'cn', 'China', 30.5928, 114.3055)
city('Hong Kong', 'hk', 'Hong Kong', 22.3193, 114.1694)
city('Macau', 'mo', 'Macau', 22.1987, 113.5439)
city('Taipei', 'tw', 'Taiwan', 25.033, 121.5654)
city('Kaohsiung', 'tw', 'Taiwan', 22.6273, 120.3014)
city('Manila', 'ph', 'Philippines', 14.5995, 120.9842)
city('Quezon City', 'ph', 'Philippines', 14.676, 121.0437)
city('Jakarta', 'id', 'Indonesia', -6.2088, 106.8456)
city('Surabaya', 'id', 'Indonesia', -7.2575, 112.7521)
city('Bali', 'id', 'Indonesia', -8.4095, 115.1889, ['Denpasar'])
city('Bangkok', 'th', 'Thailand', 13.7563, 100.5018)
city('Chiang Mai', 'th', 'Thailand', 18.7883, 98.9853)
city('Hanoi', 'vn', 'Vietnam', 21.0278, 105.8342)
city('Ho Chi Minh City', 'vn', 'Vietnam', 10.8231, 106.6297, ['Saigon'])
city('Da Nang', 'vn', 'Vietnam', 16.0544, 108.2022)
city('Phnom Penh', 'kh', 'Cambodia', 11.5564, 104.9282)
city('Vientiane', 'la', 'Laos', 17.9757, 102.6331)
city('Yangon', 'mm', 'Myanmar', 16.8409, 96.1735, ['Rangoon'])
city('Naypyidaw', 'mm', 'Myanmar', 19.7633, 96.0785)
city('Mandalay', 'mm', 'Myanmar', 21.9588, 96.0891)
city('Dhaka', 'bd', 'Bangladesh', 23.8103, 90.4125)
city('Chittagong', 'bd', 'Bangladesh', 22.3569, 91.7832)
city('Kolkata', 'in', 'India', 22.5726, 88.3639, ['Calcutta'])
city('Delhi', 'in', 'India', 28.7041, 77.1025, ['New Delhi'])
city('Mumbai', 'in', 'India', 19.076, 72.8777, ['Bombay'])
city('Bengaluru', 'in', 'India', 12.9716, 77.5946, ['Bangalore'])
city('Chennai', 'in', 'India', 13.0827, 80.2707, ['Madras'])
city('Hyderabad', 'in', 'India', 17.385, 78.4867)
city('Pune', 'in', 'India', 18.5204, 73.8567)
city('Ahmedabad', 'in', 'India', 23.0225, 72.5714)
city('Srinagar', 'in', 'India', 34.0837, 74.7973)
city('Islamabad', 'pk', 'Pakistan', 33.6844, 73.0479)
city('Karachi', 'pk', 'Pakistan', 24.8607, 67.0011)
city('Lahore', 'pk', 'Pakistan', 31.5204, 74.3587)
city('Peshawar', 'pk', 'Pakistan', 34.0151, 71.5249)
city('Kabul', 'af', 'Afghanistan', 34.5553, 69.2075)
city('Kandahar', 'af', 'Afghanistan', 31.6133, 65.7101)
city('Kathmandu', 'np', 'Nepal', 27.7172, 85.324)
city('Colombo', 'lk', 'Sri Lanka', 6.9271, 79.8612)
city('Male', 'mv', 'Maldives', 4.1755, 73.5093, ['Malé'])
city('Thimphu', 'bt', 'Bhutan', 27.471, 89.6339)
city('Tashkent', 'uz', 'Uzbekistan', 41.2995, 69.2401)
city('Samarkand', 'uz', 'Uzbekistan', 39.627, 66.975)
city('Astana', 'kz', 'Kazakhstan', 51.1605, 71.4704, ['Nur-Sultan'])
city('Almaty', 'kz', 'Kazakhstan', 43.238, 76.8829)
city('Bishkek', 'kg', 'Kyrgyzstan', 42.8746, 74.5698)
city('Dushanbe', 'tj', 'Tajikistan', 38.5598, 68.787)
city('Ashgabat', 'tm', 'Turkmenistan', 37.9601, 58.3261)
city('Ulaanbaatar', 'mn', 'Mongolia', 47.8864, 106.9057)
city('Kuala Lumpur', 'my', 'Malaysia', 3.139, 101.6869)
city('Singapore', 'sg', 'Singapore', 1.3521, 103.8198)
city('Dili', 'tl', 'Timor-Leste', -8.5569, 125.5603)
city('Port Moresby', 'pg', 'Papua New Guinea', -9.4438, 147.1803)
city('Suva', 'fj', 'Fiji', -18.1416, 178.4419)

/* ------------------------------------------------------------------ */
/* Oceania                                                             */
/* ------------------------------------------------------------------ */

city('Sydney', 'au', 'Australia', -33.8688, 151.2093)
city('Melbourne', 'au', 'Australia', -37.8136, 144.9631)
city('Brisbane', 'au', 'Australia', -27.4698, 153.0251)
city('Perth', 'au', 'Australia', -31.9505, 115.8605)
city('Adelaide', 'au', 'Australia', -34.9285, 138.6007)
city('Canberra', 'au', 'Australia', -35.2809, 149.13)
city('Auckland', 'nz', 'New Zealand', -36.8485, 174.7633)
city('Wellington', 'nz', 'New Zealand', -41.2865, 174.7762)
city('Christchurch', 'nz', 'New Zealand', -43.5321, 172.6362)

/* ------------------------------------------------------------------ */
/* Countries (centroid coordinates, `country` precision)               */
/* ------------------------------------------------------------------ */

const COUNTRIES = []

function country(name, cc, lat, lon, aliases = []) {
  COUNTRIES.push({
    type: 'country',
    name,
    cc,
    lat,
    lon,
    aliases: [name, ...aliases],
  })
}

country('United States', 'us', 39.8283, -98.5795, ['US', 'U.S.', 'USA', 'U.S.A.', 'United States of America', 'American'])
country('Canada', 'ca', 56.1304, -106.3468, ['Canadian'])
country('Mexico', 'mx', 23.6345, -102.5528, ['Mexican'])
country('Brazil', 'br', -14.235, -51.9253, ['Brazilian'])
country('Argentina', 'ar', -38.4161, -63.6167, ['Argentine', 'Argentinian'])
country('Chile', 'cl', -35.6751, -71.543, ['Chilean'])
country('Peru', 'pe', -9.19, -75.0152, ['Peruvian'])
country('Colombia', 'co', 4.5709, -74.2973, ['Colombian'])
country('Venezuela', 've', 6.4238, -66.5897, ['Venezuelan'])
country('Ecuador', 'ec', -1.8312, -78.1834, ['Ecuadorian'])
country('Bolivia', 'bo', -16.2902, -63.5887, ['Bolivian'])
country('Paraguay', 'py', -23.4425, -58.4438, ['Paraguayan'])
country('Uruguay', 'uy', -32.5228, -55.7658, ['Uruguayan'])
country('Cuba', 'cu', 21.5218, -77.7812, ['Cuban'])
country('Haiti', 'ht', 18.9712, -72.2852, ['Haitian'])
country('Dominican Republic', 'do', 18.7357, -70.1627)
country('Guatemala', 'gt', 15.7835, -90.2308, ['Guatemalan'])
country('Honduras', 'hn', 15.2, -86.2419, ['Honduran'])
country('El Salvador', 'sv', 13.7942, -88.8965, ['Salvadoran'])
country('Nicaragua', 'ni', 12.8654, -85.2072, ['Nicaraguan'])
country('Costa Rica', 'cr', 9.7489, -83.7534, ['Costa Rican'])
country('Panama', 'pa', 8.538, -80.7821, ['Panamanian'])
country('Jamaica', 'jm', 18.1096, -77.2975, ['Jamaican'])
country('Guyana', 'gy', 4.8604, -58.9302, ['Guyanese'])
country('Suriname', 'sr', 3.9193, -56.0278)

country('United Kingdom', 'gb', 54.0, -2.5, ['UK', 'U.K.', 'Britain', 'Great Britain', 'British', 'England', 'English', 'Scotland', 'Scottish', 'Wales', 'Welsh', 'Northern Ireland'])
country('Ireland', 'ie', 53.1424, -7.6921, ['Irish'])
country('France', 'fr', 46.2276, 2.2137, ['French'])
country('Germany', 'de', 51.1657, 10.4515, ['German'])
country('Spain', 'es', 40.4637, -3.7492, ['Spanish'])
country('Portugal', 'pt', 39.3999, -8.2245, ['Portuguese'])
country('Italy', 'it', 41.8719, 12.5674, ['Italian'])
country('Netherlands', 'nl', 52.1326, 5.2913, ['Dutch', 'Holland'])
country('Belgium', 'be', 50.5039, 4.4699, ['Belgian'])
country('Luxembourg', 'lu', 49.8153, 6.1296)
country('Switzerland', 'ch', 46.8182, 8.2275, ['Swiss'])
country('Austria', 'at', 47.5162, 14.5501, ['Austrian'])
country('Denmark', 'dk', 56.2639, 9.5018, ['Danish'])
country('Norway', 'no', 60.472, 8.4689, ['Norwegian'])
country('Sweden', 'se', 60.1282, 18.6435, ['Swedish'])
country('Finland', 'fi', 61.9241, 25.7482, ['Finnish'])
country('Iceland', 'is', 64.9631, -19.0208, ['Icelandic'])
country('Poland', 'pl', 51.9194, 19.1451, ['Polish'])
country('Czech Republic', 'cz', 49.8175, 15.473, ['Czechia', 'Czech'])
country('Slovakia', 'sk', 48.669, 19.699, ['Slovak'])
country('Hungary', 'hu', 47.1625, 19.5033, ['Hungarian'])
country('Romania', 'ro', 45.9432, 24.9668, ['Romanian'])
country('Bulgaria', 'bg', 42.7339, 25.4858, ['Bulgarian'])
country('Greece', 'gr', 39.0742, 21.8243, ['Greek'])
country('Croatia', 'hr', 45.1, 15.2, ['Croatian'])
country('Serbia', 'rs', 44.0165, 21.0059, ['Serbian'])
country('Bosnia and Herzegovina', 'ba', 43.9159, 17.6791, ['Bosnia', 'Bosnian'])
country('Slovenia', 'si', 46.1512, 14.9955, ['Slovenian'])
country('North Macedonia', 'mk', 41.6086, 21.7453, ['Macedonia'])
country('Albania', 'al', 41.1533, 20.1683, ['Albanian'])
country('Montenegro', 'me', 42.7087, 19.3744)
country('Kosovo', 'xk', 42.6026, 20.903)
country('Moldova', 'md', 47.4116, 28.3699, ['Moldovan'])
country('Ukraine', 'ua', 48.3794, 31.1656, ['Ukrainian'])
country('Belarus', 'by', 53.7098, 27.9534, ['Belarusian'])
country('Russia', 'ru', 61.524, 105.3188, ['Russian'])
country('Lithuania', 'lt', 55.1694, 23.8813, ['Lithuanian'])
country('Latvia', 'lv', 56.8796, 24.6032, ['Latvian'])
country('Estonia', 'ee', 58.5953, 25.0136, ['Estonian'])
country('Malta', 'mt', 35.9375, 14.3754, ['Maltese'])
country('Cyprus', 'cy', 35.1264, 33.4299, ['Cypriot'])

country('Turkey', 'tr', 38.9637, 35.2433, ['Turkish', 'Turkiye', 'Türkiye'])
country('Syria', 'sy', 34.8021, 38.9968, ['Syrian'])
country('Lebanon', 'lb', 33.8547, 35.8623, ['Lebanese'])
country('Israel', 'il', 31.0461, 34.8516, ['Israeli'])
country('Palestine', 'ps', 31.9522, 35.2332, ['Palestinian'])
country('Jordan', 'jo', 30.5852, 36.2384, ['Jordanian'])
country('Iraq', 'iq', 33.2232, 43.6793, ['Iraqi'])
country('Iran', 'ir', 32.4279, 53.688, ['Iranian'])
country('Saudi Arabia', 'sa', 23.8859, 45.0792, ['Saudi'])
country('United Arab Emirates', 'ae', 23.4241, 53.8478, ['UAE', 'Emirati'])
country('Qatar', 'qa', 25.3548, 51.1839, ['Qatari'])
country('Kuwait', 'kw', 29.3117, 47.4818, ['Kuwaiti'])
country('Bahrain', 'bh', 25.9304, 50.6378, ['Bahraini'])
country('Oman', 'om', 21.4735, 55.9754, ['Omani'])
country('Yemen', 'ye', 15.5527, 48.5164, ['Yemeni'])
country('Egypt', 'eg', 26.8206, 30.8025, ['Egyptian'])
country('Libya', 'ly', 26.3351, 17.2283, ['Libyan'])
country('Tunisia', 'tn', 33.8869, 9.5375, ['Tunisian'])
country('Algeria', 'dz', 28.0339, 1.6596, ['Algerian'])
country('Morocco', 'ma', 31.7917, -7.0926, ['Moroccan'])
country('Sudan', 'sd', 12.8628, 30.2176, ['Sudanese'])
country('South Sudan', 'ss', 6.877, 31.307)
country('Ethiopia', 'et', 9.145, 40.4897, ['Ethiopian'])
country('Eritrea', 'er', 15.1794, 39.7823, ['Eritrean'])
country('Djibouti', 'dj', 11.8251, 42.5903)
country('Somalia', 'so', 5.1521, 46.1996, ['Somali'])
country('Kenya', 'ke', -0.0236, 37.9062, ['Kenyan'])
country('Uganda', 'ug', 1.3733, 32.2903, ['Ugandan'])
country('Rwanda', 'rw', -1.9403, 29.8739, ['Rwandan'])
country('Burundi', 'bi', -3.3731, 29.9189, ['Burundian'])
country('Tanzania', 'tz', -6.369, 34.8888, ['Tanzanian'])
country('Mozambique', 'mz', -18.6657, 35.5296, ['Mozambican'])
country('Zimbabwe', 'zw', -19.0154, 29.1549, ['Zimbabwean'])
country('Zambia', 'zm', -13.1339, 27.8493, ['Zambian'])
country('Malawi', 'mw', -13.2543, 34.3015, ['Malawian'])
country('Angola', 'ao', -11.2027, 17.8739, ['Angolan'])
country('Namibia', 'na', -22.9576, 18.4904, ['Namibian'])
country('Botswana', 'bw', -22.3285, 24.6849, ['Botswanan'])
country('South Africa', 'za', -30.5595, 22.9375, ['South African'])
country('Lesotho', 'ls', -29.61, 28.2336)
country('Eswatini', 'sz', -26.5225, 31.4659)
country('Madagascar', 'mg', -18.7669, 46.8691, ['Malagasy'])
country('Mauritius', 'mu', -20.3484, 57.5522)
country('Nigeria', 'ng', 9.082, 8.6753, ['Nigerian'])
country('Ghana', 'gh', 7.9465, -1.0232, ['Ghanaian'])
country("Cote d'Ivoire", 'ci', 7.54, -5.5471, ["Côte d'Ivoire", 'Ivory Coast', 'Ivorian'])
country('Senegal', 'sn', 14.4974, -14.4524, ['Senegalese'])
country('Mali', 'ml', 17.5707, -3.9962, ['Malian'])
country('Burkina Faso', 'bf', 12.2383, -1.5616)
country('Niger', 'ne', 17.6078, 8.0817, ['Nigerien'])
country('Chad', 'td', 15.4542, 18.7322, ['Chadian'])
country('Cameroon', 'cm', 7.3697, 12.3547, ['Cameroonian'])
country('Central African Republic', 'cf', 6.6111, 20.9394)
country('Democratic Republic of the Congo', 'cd', -4.0383, 21.7587, ['DRC', 'DR Congo', 'Congo-Kinshasa', 'Congo', 'Congolese'])
country('Republic of the Congo', 'cg', -0.228, 15.8277, ['Congo-Brazzaville'])
country('Gabon', 'ga', -0.8037, 11.6094, ['Gabonese'])
country('Equatorial Guinea', 'gq', 1.6508, 10.2679)
country('Benin', 'bj', 9.3077, 2.3158, ['Beninese'])
country('Togo', 'tg', 8.6195, 0.8248)
country('Sierra Leone', 'sl', 8.4606, -11.7799)
country('Liberia', 'lr', 6.4281, -9.4295, ['Liberian'])
country('Guinea', 'gn', 9.9456, -9.6966)
country('Gambia', 'gm', 13.4432, -15.3101)
country('Guinea-Bissau', 'gw', 11.8037, -15.1804)
country('Mauritania', 'mr', 21.0079, -10.9408)
country('Somaliland', 'so', 9.5, 45.5)

country('China', 'cn', 35.8617, 104.1954, ['Chinese'])
country('Japan', 'jp', 36.2048, 138.2529, ['Japanese'])
country('South Korea', 'kr', 35.9078, 127.7669, ['Korea', 'Korean', 'Republic of Korea'])
country('North Korea', 'kp', 40.3399, 127.5101, ['DPRK'])
country('Taiwan', 'tw', 23.6978, 120.9605, ['Taiwanese'])
country('Mongolia', 'mn', 46.8625, 103.8467, ['Mongolian'])
country('Vietnam', 'vn', 14.0583, 108.2772, ['Vietnamese'])
country('Thailand', 'th', 15.87, 100.9925, ['Thai'])
country('Cambodia', 'kh', 12.5657, 104.991, ['Cambodian'])
country('Laos', 'la', 19.8563, 102.4954, ['Lao'])
country('Myanmar', 'mm', 21.9162, 95.956, ['Burma', 'Burmese'])
country('Malaysia', 'my', 4.2105, 101.9758, ['Malaysian'])
country('Singapore', 'sg', 1.3521, 103.8198)
country('Indonesia', 'id', -0.7893, 113.9213, ['Indonesian'])
country('Philippines', 'ph', 12.8797, 121.774, ['Filipino', 'Philippine'])
country('Brunei', 'bn', 4.5353, 114.7277)
country('Timor-Leste', 'tl', -8.8742, 125.7275, ['East Timor'])
country('India', 'in', 20.5937, 78.9629, ['Indian'])
country('Pakistan', 'pk', 30.3753, 69.3451, ['Pakistani'])
country('Bangladesh', 'bd', 23.685, 90.3563, ['Bangladeshi'])
country('Sri Lanka', 'lk', 7.8731, 80.7718, ['Sri Lankan'])
country('Nepal', 'np', 28.3949, 84.124, ['Nepali'])
country('Bhutan', 'bt', 27.5142, 90.4336)
country('Afghanistan', 'af', 33.9391, 67.71, ['Afghan'])
country('Tajikistan', 'tj', 38.861, 71.2761, ['Tajik'])
country('Uzbekistan', 'uz', 41.3775, 64.5853, ['Uzbek'])
country('Turkmenistan', 'tm', 38.9697, 59.5563)
country('Kazakhstan', 'kz', 48.0196, 66.9237, ['Kazakh'])
country('Kyrgyzstan', 'kg', 41.2044, 74.7661, ['Kyrgyz'])
country('Azerbaijan', 'az', 40.1431, 47.5769, ['Azerbaijani'])
country('Armenia', 'am', 40.0691, 45.0382, ['Armenian'])
country('Georgia', 'ge', 42.3154, 43.3569, ['Georgian'])

country('Australia', 'au', -25.2744, 133.7751, ['Australian'])
country('New Zealand', 'nz', -40.9006, 174.886)
country('Papua New Guinea', 'pg', -6.315, 143.9555)
country('Fiji', 'fj', -17.7134, 178.065)

/* ------------------------------------------------------------------ */
/* Matching engine                                                     */
/* ------------------------------------------------------------------ */

const ENTRIES = [...CITIES, ...COUNTRIES]

// Names that are far more often a person, a US state, or a common word than
// the country itself. Matching them would put honest-looking but wrong pins
// on the map, so we skip their bare country name (cities still work).
const BLOCKED_COUNTRY_NAMES = new Set(['Jordan', 'Georgia', 'Chad'])

const aliasToEntry = new Map()
const allAliases = []

for (const entry of ENTRIES) {
  for (const alias of entry.aliases) {
    if (!alias) continue
    if (entry.type === 'country' && BLOCKED_COUNTRY_NAMES.has(alias)) continue
    if (aliasToEntry.has(alias)) continue
    aliasToEntry.set(alias, entry)
    allAliases.push(alias)
  }
}

// Longest first so "New York" beats "York" and "South Korea" beats "Korea".
allAliases.sort((a, b) => b.length - a.length)

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

let matcher = null
try {
  matcher = new RegExp(
    `(?<![A-Za-z])(${allAliases.map(escapeRegExp).join('|')})(?![A-Za-z])`,
    'g',
  )
} catch (error) {
  // Fallback: if the combined expression is too large for the engine, match
  // each alias separately. Slower but always correct.
  matcher = null
}

function findMatches(text) {
  if (!text) return []
  if (!matcher) {
    const found = []
    for (const alias of allAliases) {
      let index = text.indexOf(alias)
      while (index !== -1) {
        const before = index === 0 ? '' : text[index - 1]
        const after = text[index + alias.length] || ''
        if (!/[A-Za-z]/.test(before) && !/[A-Za-z]/.test(after)) {
          found.push({ entry: aliasToEntry.get(alias), index, length: alias.length })
        }
        index = text.indexOf(alias, index + alias.length)
      }
    }
    return found.sort((a, b) => a.index - b.index)
  }

  const found = []
  matcher.lastIndex = 0
  let match
  while ((match = matcher.exec(text)) !== null) {
    const entry = aliasToEntry.get(match[1])
    if (entry) {
      found.push({ entry, index: match.index, length: match[0].length })
    }
    if (match.index === matcher.lastIndex) matcher.lastIndex++
  }
  return found
}

/**
 * Extract the most likely event location from a headline and summary.
 * City mentions win over country mentions because they describe where an
 * event happened, not merely which country is involved.
 */
function extractLocation(title, summary) {
  const titleMatches = findMatches(title || '')
  const pool = titleMatches.length
    ? titleMatches
    : findMatches((summary || '').slice(0, 600))

  if (!pool.length) return null

  const cityMatch = pool.find((m) => m.entry.type === 'city')
  const countryMatch = pool.find((m) => m.entry.type === 'country')
  const chosen = cityMatch || countryMatch || pool[0]
  const entry = chosen.entry

  if (entry.type === 'city') {
    return {
      latitude: entry.lat,
      longitude: entry.lon,
      eventLocation: `${entry.name}, ${entry.country}`,
      country: entry.country,
      countryCode: entry.cc,
      region: '',
      city: entry.name,
      precision: 'city',
      confidence: 0.8,
    }
  }

  return {
    latitude: entry.lat,
    longitude: entry.lon,
    eventLocation: entry.name,
    country: entry.name,
    countryCode: entry.cc,
    region: '',
    city: '',
    precision: 'country',
    confidence: 0.5,
  }
}

module.exports = {
  extractLocation,
  CITY_COUNT: CITIES.length,
  COUNTRY_COUNT: COUNTRIES.length,
}
