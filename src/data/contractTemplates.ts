export interface ContractField {
  key: string;
  label: string;
  placeholder: string;
  type?: 'text' | 'textarea' | 'date';
  defaultValue?: string;
  section?: string;
}

export interface ContractTemplate {
  slug: string;
  title: string;
  shortTitle: string;
  category: string;
  seoTitle: string;
  seoDescription: string;
  summary: string;
  legalNote: string;
  docxUrl?: string;
  fields: ContractField[];
  buildSections: (values: Record<string, string>) => { heading: string; paragraphs: string[] }[];
}

const val = (values: Record<string, string>, key: string, fallback = '____________________'): string => {
  const v = values[key]?.trim();
  return v ? v : fallback;
};

export const contractTemplates: ContractTemplate[] = [
  {
    slug: 'asuinhuoneiston-vuokrasopimus',
    title: 'Asuinhuoneiston vuokrasopimus',
    shortTitle: 'Vuokrasopimus',
    category: 'Asuminen',
    seoTitle: 'Vuokrasopimus pohja (PDF) – Täytä ja allekirjoita sähköisesti | Helppo Allekirjoitus',
    seoDescription: 'Ilmainen asuinhuoneiston vuokrasopimuspohja (AHVL). Täytä vuokrasopimus suoraan selaimessa, lataa PDF-tiedostona tai allekirjoita pankkitunnuksilla (1,49 €).',
    summary: 'Lakiin asuinhuoneiston vuokrauksesta (AHVL 481/1995) perustuva selkeä vuokrasopimus vuokranantajan ja vuokralaisen välille.',
    legalNote: 'Sähköisesti vahvalla tunnistautumisella (FTN) allekirjoitettu vuokrasopimus täyttää AHVL 5 §:n kirjallisen muodon vaatimuksen.',
    docxUrl: 'https://dokumenttipohja.fi/Asuinhuoneiston%20vuokrasopimus.docx',
    fields: [
      { key: 'landlordName', label: 'Vuokranantajan nimi', placeholder: 'Matti Meikäläinen / Asuntosijoitus Oy', section: '1. Osapuolet' },
      { key: 'landlordId', label: 'Vuokranantajan syntymäaika tai Y-tunnus', placeholder: '010180 / 1234567-8', section: '1. Osapuolet' },
      { key: 'landlordContact', label: 'Vuokranantajan osoite ja puhelin', placeholder: 'Esimerkkikatu 1, 00100 Helsinki, 040 123 4567', section: '1. Osapuolet' },
      { key: 'landlordEmail', label: 'Vuokranantajan sähköposti', placeholder: 'vuokranantaja@esimerkki.fi', section: '1. Osapuolet' },
      { key: 'tenantName', label: 'Vuokralaisen nimi', placeholder: 'Maija Virtanen', section: '1. Osapuolet' },
      { key: 'tenantId', label: 'Vuokralaisen syntymäaika', placeholder: '15.05.1995', section: '1. Osapuolet' },
      { key: 'tenantContact', label: 'Vuokralaisen puhelin ja nykyinen osoite', placeholder: '050 987 6543', section: '1. Osapuolet' },
      { key: 'tenantEmail', label: 'Vuokralaisen sähköposti', placeholder: 'vuokralainen@esimerkki.fi', section: '1. Osapuolet' },
      { key: 'propertyAddress', label: 'Vuokrattavan huoneiston osoite', placeholder: 'Mannerheimintie 10 A 12, 00100 Helsinki', section: '2. Vuokrauskohde' },
      { key: 'propertyDetails', label: 'Huoneluku ja pinta-ala', placeholder: '2h + kt + p, 48,5 m²', section: '2. Vuokrauskohde' },
      { key: 'termType', label: 'Sopimuksen kesto', placeholder: 'Toistaiseksi voimassa oleva (tai määräaikainen pvm asti)', defaultValue: 'Toistaiseksi voimassa oleva', section: '3. Vuokra-aika ja vuokra' },
      { key: 'startDate', label: 'Hallintaoikeuden ja vuokra-ajan alkamispäivä', placeholder: '1.9.2026', section: '3. Vuokra-aika ja vuokra' },
      { key: 'rentAmount', label: 'Kuukausivuokra (€ / kk)', placeholder: '850,00 € / kk', section: '3. Vuokra-aika ja vuokra' },
      { key: 'waterFee', label: 'Vesimaksu ja muut maksut', placeholder: '20,00 € / hlö / kk (tai kulutuksen mukaan)', section: '3. Vuokra-aika ja vuokra' },
      { key: 'paymentAccount', label: 'Maksutili (IBAN) ja eräpäivä', placeholder: 'FI00 1234 5600 0007 89, eräpäivä kuukauden 2. päivä', section: '3. Vuokra-aika ja vuokra' },
      { key: 'deposit', label: 'Vuokravakuus', placeholder: '1 700,00 € (2 kk vuokraa vastaava vakuus ennen avainten luovutusta)', section: '4. Vakuus ja erityisehdot' },
      { key: 'otherTerms', label: 'Muut ehdot (kotivakuutus, tupakointi, lemmikit, vuokran tarkistus)', type: 'textarea', defaultValue: 'Vuokralainen sitoutuu ottamaan ja pitämään voimassa laajan kotivakuutuksen vastuuvakuutusosineen koko vuokrasuhteen ajan. Tupakointi huoneistossa ja parvekkeella on kielletty. Vuokraa tarkistetaan vuosittain elinkustannusindeksin muutosta vastaavasti.', placeholder: 'Lisäehdot...', section: '4. Vakuus ja erityisehdot' },
    ],
    buildSections: (v) => [
      {
        heading: '1. VUOKRASOPIMUKSEN OSAPUOLET',
        paragraphs: [
          `Vuokranantaja: ${val(v, 'landlordName')} (${val(v, 'landlordId')})\nYhteystiedot: ${val(v, 'landlordContact')}, ${val(v, 'landlordEmail')}`,
          `Vuokralainen: ${val(v, 'tenantName')} (${val(v, 'tenantId')})\nYhteystiedot: ${val(v, 'tenantContact')}, ${val(v, 'tenantEmail')}`,
        ],
      },
      {
        heading: '2. VUOKRAUSKOHDE JA KUNTO',
        paragraphs: [
          `Osoite: ${val(v, 'propertyAddress')}\nHuoneiston tiedot: ${val(v, 'propertyDetails')}`,
          'Huoneisto vuokrataan asuinkäyttöön. Vuokralainen on tarkastanut huoneiston ennen sopimuksen tekemistä ja hyväksyy sen siinä kunnossa kuin se on tarkastushetkellä.',
        ],
      },
      {
        heading: '3. VUOKRA-AIKA',
        paragraphs: [
          `Sopimuksen voimassaolo: ${val(v, 'termType')}.\nVuokra-aika ja hallintaoikeus alkavat: ${val(v, 'startDate')}.`,
          'Toistaiseksi voimassa olevan vuokrasopimuksen irtisanomisaika määräytyy lain asuinhuoneiston vuokrauksesta (AHVL 52 §) mukaisesti: vuokranantajan irtisanoessa 3 kuukautta (tai 6 kuukautta, jos vuokrasuhde on kestänyt vähintään 1 vuoden) ja vuokralaisen irtisanoessa 1 kalenterikuukausi.',
        ],
      },
      {
        heading: '4. VUOKRA JA VAKUUS',
        paragraphs: [
          `Kuukausivuokra: ${val(v, 'rentAmount')}\nVesimaksu ja erilliskorvaukset: ${val(v, 'waterFee')}\nMaksutiedot ja eräpäivä: ${val(v, 'paymentAccount')}`,
          `Vuokravakuus: ${val(v, 'deposit')}`,
        ],
      },
      {
        heading: '5. MUUT EHDOT',
        paragraphs: [
          val(v, 'otherTerms', 'Vuokrasuhteessa noudatetaan lakia asuinhuoneiston vuokrauksesta (481/1995) sekä hyvää vuokratapaa.'),
        ],
      },
    ],
  },
  {
    slug: 'ajoneuvon-kauppakirja',
    title: 'Ajoneuvon kauppakirja',
    shortTitle: 'Auton kauppakirja',
    category: 'Kauppakirjat',
    seoTitle: 'Auton ja ajoneuvon kauppakirja pohja (PDF) – Täytä ja allekirjoita',
    seoDescription: 'Tee virallinen auton tai muun ajoneuvon kauppakirja verkossa. Lataa valmis PDF ilmaiseksi tai allekirjoita molempien osapuolten pankkitunnuksilla (1,49 €).',
    summary: 'Selkeä kauppakirja henkilöauton, pakettiauton, moottoripyörän tai muun rekisteröitävän ajoneuvon kauppaan.',
    legalNote: 'Pankkitunnuksilla (FTN) vahvistettu kauppakirja varmentaa sekä myyjän että ostajan henkilöllisyyden kiistattomasti.',
    docxUrl: 'https://dokumenttipohja.fi/Ajoneuvon%20kauppakirja.docx',
    fields: [
      { key: 'sellerName', label: 'Myyjän nimi', placeholder: 'Matti Meikäläinen', section: '1. Osapuolet' },
      { key: 'sellerContact', label: 'Myyjän osoite ja puhelin', placeholder: 'Kotikatu 5, 33100 Tampere, 040 123 4567', section: '1. Osapuolet' },
      { key: 'sellerEmail', label: 'Myyjän sähköposti', placeholder: 'myyja@esimerkki.fi', section: '1. Osapuolet' },
      { key: 'buyerName', label: 'Ostajan nimi', placeholder: 'Mikko Ostaja', section: '1. Osapuolet' },
      { key: 'buyerContact', label: 'Ostajan osoite ja puhelin', placeholder: 'Rantatie 8, 20100 Turku, 050 987 6543', section: '1. Osapuolet' },
      { key: 'buyerEmail', label: 'Ostajan sähköposti', placeholder: 'ostaja@esimerkki.fi', section: '1. Osapuolet' },
      { key: 'regNumber', label: 'Rekisteritunnus', placeholder: 'ABC-123', section: '2. Ajoneuvon tiedot' },
      { key: 'makeModel', label: 'Merkki, malli ja käyttöönottovuosi', placeholder: 'Toyota Corolla 1.8 Hybrid, 2020', section: '2. Ajoneuvon tiedot' },
      { key: 'mileage', label: 'Matkamittarin lukema (km)', placeholder: '94 500 km', section: '2. Ajoneuvon tiedot' },
      { key: 'equipment', label: 'Kauppaan sisältyvät varusteet', placeholder: 'Kahdet renkaat vanteineen, kaksi avainta, huoltokirja, lohkolämmitin', defaultValue: 'Kahdet renkaat, kaksi avainta ja huoltoasiakirjat.', section: '2. Ajoneuvon tiedot' },
      { key: 'price', label: 'Kauppahinta (€) ja maksutapa', placeholder: '14 500,00 €, maksetaan tilisiirtona luovutushetkellä', section: '3. Kauppahinta ja ehdot' },
      { key: 'conditionNotes', label: 'Ajoneuvon kunto ja mahdolliset huomiot', type: 'textarea', defaultValue: 'Ostaja on koeajanut ja tarkastanut ajoneuvon ennen kauppaa ja hyväksyy sen nykyisessä kunnossaan. Myyjä vakuuttaa, että hänellä on täysi omistusoikeus ajoneuvoon eikä siihen kohdistu maksamattomia veroja tai rahoitusrasitteita.', placeholder: 'Kunto ja ehdot...', section: '3. Kauppahinta ja ehdot' },
    ],
    buildSections: (v) => [
      {
        heading: '1. OSAPUOLET',
        paragraphs: [
          `Myyjä: ${val(v, 'sellerName')}\nYhteystiedot: ${val(v, 'sellerContact')}, ${val(v, 'sellerEmail')}`,
          `Ostaja: ${val(v, 'buyerName')}\nYhteystiedot: ${val(v, 'buyerContact')}, ${val(v, 'buyerEmail')}`,
        ],
      },
      {
        heading: '2. KAUPAN KOHDE',
        paragraphs: [
          `Rekisteritunnus: ${val(v, 'regNumber')}\nMerkki, malli ja vuosimalli: ${val(v, 'makeModel')}\nMatkamittarin lukema: ${val(v, 'mileage')}`,
          `Kauppaan sisältyvät varusteet: ${val(v, 'equipment')}`,
        ],
      },
      {
        heading: '3. KAUPPAHINTA JA OMISTUSOIKEUS',
        paragraphs: [
          `Kauppahinta ja maksuehto: ${val(v, 'price')}`,
          'Ajoneuvon omistusoikeus siirtyy ostajalle, kun koko kauppahinta on maksettu. Vaaranvastuu siirtyy ostajalle ajoneuvon luovutushetkellä. Myyjä luovuttaa ostajalle Traficomin varmenteen rekisteröinti-ilmoitusta varten.',
        ],
      },
      {
        heading: '4. AJONEUVON KUNTO JA VASTUUT',
        paragraphs: [
          val(v, 'conditionNotes'),
        ],
      },
    ],
  },
  {
    slug: 'velkakirja',
    title: 'Velkakirja',
    shortTitle: 'Velkakirja',
    category: 'Rahoitus & Laina',
    seoTitle: 'Velkakirja pohja (PDF) – Luo virallinen velkakirja ja allekirjoita',
    seoDescription: 'Ilmainen velkakirjapohja yksityishenkilöiden tai yritysten välille. Täytä lainasumma, korko ja maksuohjelma ja allekirjoita pankkitunnuksilla (1,49 €).',
    summary: 'Velkakirjalain (622/1947) mukainen tavallinen velkakirja lainasumman, koron ja takaisinmaksuaikataulun sopimiseen.',
    legalNote: 'Vahvasti sähköisesti allekirjoitettu velkakirja todistaa velkasuhteen syntymisen, velan määrän ja sovitut maksuehdot.',
    docxUrl: 'https://dokumenttipohja.fi/Velkakirja.docx',
    fields: [
      { key: 'creditorName', label: 'Velkojan (lainanantajan) nimi', placeholder: 'Matti Meikäläinen / Yritys Oy', section: '1. Osapuolet' },
      { key: 'creditorEmail', label: 'Velkojan sähköposti', placeholder: 'velkoja@esimerkki.fi', section: '1. Osapuolet' },
      { key: 'debtorName', label: 'Velallisen (lainansaajan) nimi', placeholder: 'Teppo Velallinen', section: '1. Osapuolet' },
      { key: 'debtorId', label: 'Velallisen syntymäaika tai Y-tunnus', placeholder: '020285 / 1234567-8', section: '1. Osapuolet' },
      { key: 'debtorAddress', label: 'Velallisen osoite', placeholder: 'Keskuskatu 4, 00100 Helsinki', section: '1. Osapuolet' },
      { key: 'debtorEmail', label: 'Velallisen sähköposti', placeholder: 'velallinen@esimerkki.fi', section: '1. Osapuolet' },
      { key: 'principal', label: 'Velan pääoma (€ numeroin ja kirjaimin)', placeholder: '5 000,00 € (viisituhatta euroa)', section: '2. Velan määrä ja ehdot' },
      { key: 'interest', label: 'Vuotuinen korko (%)', placeholder: '3,0 % (tai koroton)', defaultValue: '0 % (koroton)', section: '2. Velan määrä ja ehdot' },
      { key: 'repaymentPlan', label: 'Takaisinmaksuohjelma ja eräpäivä', type: 'textarea', placeholder: 'Maksetaan takaisin 10 tasaerässä (500 €/kk) kunkin kuukauden 15. päivä alkaen 15.9.2026 tilille FI00...', section: '2. Velan määrä ja ehdot' },
    ],
    buildSections: (v) => [
      {
        heading: '1. VELKAKIRJAN OSAPUOLET',
        paragraphs: [
          `Velkoja (lainanantaja): ${val(v, 'creditorName')} (${val(v, 'creditorEmail')})`,
          `Velallinen (lainansaaja): ${val(v, 'debtorName')} (${val(v, 'debtorId')})\nOsoite: ${val(v, 'debtorAddress')}, ${val(v, 'debtorEmail')}`,
        ],
      },
      {
        heading: '2. VELKASITOUMUS JA PÄÄOMA',
        paragraphs: [
          `Velallinen sitoutuu maksamaan velkojalle tämän velkakirjan ehtojen mukaisesti velan pääoman:\n${val(v, 'principal')}.`,
        ],
      },
      {
        heading: '3. KORKO JA TAKAISINMAKSU',
        paragraphs: [
          `Vuotuinen korko: ${val(v, 'interest')}`,
          `Takaisinmaksu ja erääntyminen:\n${val(v, 'repaymentPlan')}`,
          'Mikäli suoritusta ei makseta viimeistään sovittuna eräpäivänä, velallinen on velvollinen maksamaan viivästyneelle määrälle korkolain (633/1982) mukaista viivästyskorkoa eräpäivästä maksupäivään saakka. Velallisella on oikeus maksaa velka tai sen osa ennenaikaisesti ilman lisäkuluja.',
        ],
      },
    ],
  },
  {
    slug: 'valtakirja',
    title: 'Yksilöity valtakirja',
    shortTitle: 'Valtakirja',
    category: 'Valtuutukset',
    seoTitle: 'Valtakirja pohja (PDF) – Luo virallinen valtakirja pankkitunnuksilla',
    seoDescription: 'Ilmainen yksilöity valtakirjapohja asioiden hoitamiseen. Täytä valtuuttajan ja valtuutetun tiedot ja vahvista valtakirja pankkitunnuksilla (1,49 €).',
    summary: 'Yksilöity valtakirja nimetyn asian, kaupan, kokousedustuksen tai viranomaisasioinnin hoitamiseen.',
    legalNote: 'Vahvalla sähköisellä tunnistautumisella (FTN) allekirjoitettu valtakirja todentaa valtuuttajan henkilöllisyyden ja valtuutuksen antamisajankohdan.',
    fields: [
      { key: 'grantorName', label: 'Valtuuttajan nimi', placeholder: 'Matti Meikäläinen', section: '1. Osapuolet' },
      { key: 'grantorId', label: 'Valtuuttajan syntymäaika tai Y-tunnus', placeholder: '01.01.1980', section: '1. Osapuolet' },
      { key: 'grantorContact', label: 'Valtuuttajan osoite ja puhelin', placeholder: 'Esimerkkikatu 1, 00100 Helsinki, 040 123 4567', section: '1. Osapuolet' },
      { key: 'grantorEmail', label: 'Valtuuttajan sähköposti', placeholder: 'valtuuttaja@esimerkki.fi', section: '1. Osapuolet' },
      { key: 'granteeName', label: 'Valtuutetun nimi', placeholder: 'Maija Meikäläinen', section: '1. Osapuolet' },
      { key: 'granteeId', label: 'Valtuutetun syntymäaika', placeholder: '05.05.1985', section: '1. Osapuolet' },
      { key: 'scope', label: 'Valtuutuksen sisältö (mitä valtuutettu saa tehdä)', type: 'textarea', placeholder: 'Esim. edustaa minua Asunto Oy Esimerkin yhtiökokouksessa ja käyttää siellä äänivaltaani / noutaa ja allekirjoittaa asiakirjat...', section: '2. Valtuutuksen sisältö ja voimassaolo' },
      { key: 'validity', label: 'Voimassaoloaika', placeholder: 'Voimassa 31.12.2026 saakka (tai kunnes toimeksianto on suoritettu)', defaultValue: 'Toimeksiannon suorittamiseen saakka.', section: '2. Valtuutuksen sisältö ja voimassaolo' },
    ],
    buildSections: (v) => [
      {
        heading: '1. VALTUUTTAJA',
        paragraphs: [
          `Nimi: ${val(v, 'grantorName')} (${val(v, 'grantorId')})\nYhteystiedot: ${val(v, 'grantorContact')}, ${val(v, 'grantorEmail')}`,
        ],
      },
      {
        heading: '2. VALTUUTETTU',
        paragraphs: [
          `Nimi: ${val(v, 'granteeName')} (${val(v, 'granteeId')})`,
        ],
      },
      {
        heading: '3. VALTUUTUKSEN YKSILÖINTI',
        paragraphs: [
          `Valtuutan yllä mainitun henkilön toimimaan puolestani seuraavassa asiassa:\n${val(v, 'scope')}`,
        ],
      },
      {
        heading: '4. VOIMASSAOLO',
        paragraphs: [
          `Tämä valtakirja on voimassa: ${val(v, 'validity')}`,
        ],
      },
    ],
  },
  {
    slug: 'salassapitosopimus-nda',
    title: 'Salassapitosopimus (NDA)',
    shortTitle: 'Salassapitosopimus',
    category: 'Yritykset & Työ',
    seoTitle: 'Salassapitosopimus (NDA) pohja PDF – Täytä ja allekirjoita verkossa',
    seoDescription: 'Suomenkielinen molemminpuolinen salassapitosopimus (NDA) yrityksille ja alihankkijoille. Lataa PDF ilmaiseksi tai allekirjoita pankkitunnuksilla (1,49 €).',
    summary: 'Molemminpuolinen salassapitosopimus liikesalaisuuksien, tarjouspyyntöjen, tuotekehityksen tai yrityskauppaneuvottelujen suojaamiseen.',
    legalNote: 'Soveltuu liikesalaisuuslain (595/2018) alaisten luottamuksellisten tietojen luovuttamiseen yritysten ja asiantuntijoiden välillä.',
    fields: [
      { key: 'partyA', label: 'Osapuoli 1 (Yritys / henkilö ja Y-tunnus)', placeholder: 'Esimerkki Oy (1234567-8)', section: '1. Osapuolet' },
      { key: 'partyAEmail', label: 'Osapuolen 1 allekirjoittajan sähköposti', placeholder: 'edustaja@esimerkki.fi', section: '1. Osapuolet' },
      { key: 'partyB', label: 'Osapuoli 2 (Yritys / henkilö ja Y-tunnus)', placeholder: 'Kumppani Oy (8765432-1)', section: '1. Osapuolet' },
      { key: 'partyBEmail', label: 'Osapuolen 2 allekirjoittajan sähköposti', placeholder: 'edustaja@kumppani.fi', section: '1. Osapuolet' },
      { key: 'purpose', label: 'Yhteistyön tai neuvottelujen tarkoitus', placeholder: 'Ohjelmistokehitysprojektin kartoitus ja tarjouslaskenta', section: '2. Tarkoitus ja ehdot' },
      { key: 'penalty', label: 'Sopimussakko ja salassapidon kesto', placeholder: 'Salassapitovelvollisuus on voimassa 5 vuotta. Sopimussakko 10 000 € / rikkomus.', defaultValue: 'Salassapitovelvollisuus on voimassa viisi (5) vuotta tämän sopimuksen allekirjoittamisesta. Sopimusrikkomuksesta seuraava sopimussakko on 10 000 euroa kultakin rikkomukselta.', section: '2. Tarkoitus ja ehdot' },
    ],
    buildSections: (v) => [
      {
        heading: '1. SOPIMUKSEN OSAPUOLET',
        paragraphs: [
          `Osapuoli 1: ${val(v, 'partyA')} (${val(v, 'partyAEmail')})`,
          `Osapuoli 2: ${val(v, 'partyB')} (${val(v, 'partyBEmail')})`,
        ],
      },
      {
        heading: '2. SOPIMUKSEN TARKOITUS JA LUOTTAMUKSELLINEN TIETO',
        paragraphs: [
          `Osapuolet luovuttavat toisilleen luottamuksellista tietoa seuraavaa tarkoitusta varten:\n${val(v, 'purpose')}`,
          'Luottamuksellisella tiedolla tarkoitetaan kaikkea teknistä, kaupallista, taloudellista tai asiakkaisiin liittyvää aineistoa ja tietoa, jonka osapuoli luovuttaa toiselle kirjallisesti, sähköisesti tai suullisesti. Luottamuksellista tietoa saa käyttää ainoastaan yllä mainittuun tarkoitukseen eikä sitä saa ilmaista kolmansille osapuolille.',
        ],
      },
      {
        heading: '3. VOIMASSAOLO, VASTUU JA SOVELLETTAVA LAKI',
        paragraphs: [
          val(v, 'penalty'),
          'Tähän sopimukseen sovelletaan Suomen lakia (mukaan lukien liikesalaisuuslaki 595/2018). Mahdolliset erimielisyydet ratkaistaan ensisijaisesti neuvottelemalla ja viime kädessä toimivaltaisessa käräjäoikeudessa.',
        ],
      },
    ],
  },
  {
    slug: 'irtaimen-kauppakirja',
    title: 'Irtaimen omaisuuden kauppakirja',
    shortTitle: 'Kauppakirja',
    category: 'Kauppakirjat',
    seoTitle: 'Kauppakirja pohja (PDF) – Koneen, veneen tai laitteen kauppakirja',
    seoDescription: 'Ilmainen kauppakirjapohja veneen, työkoneen, laitteiston tai muun irtaimen omaisuuden kauppaan. Lataa PDF tai allekirjoita pankkitunnuksilla (1,49 €).',
    summary: 'Yleiskäyttöinen kauppakirja veneen, työkoneen, kaluston tai muun arvokkaan irtaimen omaisuuden myyntiin.',
    legalNote: 'Kauppalain (355/1987) mukainen kauppakirja selkeyttää omistusoikeuden siirtymisen ja kaupan ehdot.',
    fields: [
      { key: 'sellerName', label: 'Myyjän nimi ja yhteystiedot', placeholder: 'Matti Myyjä, 040 123 4567', section: '1. Osapuolet' },
      { key: 'sellerEmail', label: 'Myyjän sähköposti', placeholder: 'myyja@esimerkki.fi', section: '1. Osapuolet' },
      { key: 'buyerName', label: 'Ostajan nimi ja yhteystiedot', placeholder: 'Olli Ostaja, 050 987 6543', section: '1. Osapuolet' },
      { key: 'buyerEmail', label: 'Ostajan sähköposti', placeholder: 'ostaja@esimerkki.fi', section: '1. Osapuolet' },
      { key: 'itemDescription', label: 'Kaupan kohde ja yksilöintitiedot (sarjanumero, malli, varusteet)', type: 'textarea', placeholder: 'Esim. Buster L -alumiinivene + Yamaha 50 hv perämoottori, valmistenumero...', section: '2. Kaupan kohde ja hinta' },
      { key: 'priceAndTerms', label: 'Kauppahinta (€) ja luovutusehto', placeholder: '8 900,00 €, maksetaan tilisiirtona luovutuksen yhteydessä', section: '2. Kaupan kohde ja hinta' },
    ],
    buildSections: (v) => [
      {
        heading: '1. OSAPUOLET',
        paragraphs: [
          `Myyjä: ${val(v, 'sellerName')} (${val(v, 'sellerEmail')})`,
          `Ostaja: ${val(v, 'buyerName')} (${val(v, 'buyerEmail')})`,
        ],
      },
      {
        heading: '2. KAUPAN KOHDE',
        paragraphs: [
          val(v, 'itemDescription'),
        ],
      },
      {
        heading: '3. KAUPPAHINTA, KUNTO JA OMISTUSOIKEUS',
        paragraphs: [
          `Kauppahinta ja maksuehto: ${val(v, 'priceAndTerms')}`,
          'Ostaja on tarkastanut kaupan kohteen ennen kaupan päättämistä ja hyväksyy sen nykyisessä kunnossaan. Myyjä vakuuttaa omistavansa kaupan kohteen ja ettei siihen kohdistu kolmansien osapuolten pantti- tai pidätysoikeuksia. Omistusoikeus siirtyy ostajalle, kun kauppahinta on kokonaisuudessaan maksettu.',
        ],
      },
    ],
  },
];

const sanitizeWinAnsi = (text: string): string => {
  return text.normalize('NFC').replace(/[^\x00-\xFF]/g, '');
};

function wrapLines(text: string, maxChars = 88): string[] {
  const result: string[] = [];
  for (const rawLine of text.split('\n')) {
    const words = rawLine.split(/\s+/).filter(Boolean);
    if (words.length === 0) {
      result.push('');
      continue;
    }
    let current = words[0];
    for (let i = 1; i < words.length; i++) {
      if ((current + ' ' + words[i]).length <= maxChars) {
        current += ' ' + words[i];
      } else {
        result.push(current);
        current = words[i];
      }
    }
    result.push(current);
  }
  return result;
}

export async function generateContractPdfFile(
  template: ContractTemplate,
  values: Record<string, string>
): Promise<File> {
  const { PDFDocument, StandardFonts, rgb } = await import('pdf-lib');
  const pdfDoc = await PDFDocument.create();
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  let page = pdfDoc.addPage([595.28, 841.89]); // A4
  const { width, height } = page.getSize();
  const margin = 55;
  let y = height - margin;

  // Header rule & title
  page.drawText(sanitizeWinAnsi(template.title.toUpperCase()), {
    x: margin,
    y,
    size: 16,
    font: fontBold,
    color: rgb(0.06, 0.09, 0.16),
  });

  const dateStr = new Date().toLocaleDateString('fi-FI');
  const dateLabel = `Laadittu: ${dateStr}`;
  const dateWidth = fontRegular.widthOfTextAtSize(dateLabel, 9);
  page.drawText(dateLabel, {
    x: width - margin - dateWidth,
    y: y + 2,
    size: 9,
    font: fontRegular,
    color: rgb(0.4, 0.45, 0.52),
  });

  y -= 12;
  page.drawLine({
    start: { x: margin, y },
    end: { x: width - margin, y },
    thickness: 1,
    color: rgb(0.82, 0.85, 0.9),
  });
  y -= 28;

  const sections = template.buildSections(values);

  for (const section of sections) {
    if (y < 120) {
      page = pdfDoc.addPage([595.28, 841.89]);
      y = height - margin;
    }

    page.drawText(sanitizeWinAnsi(section.heading), {
      x: margin,
      y,
      size: 11,
      font: fontBold,
      color: rgb(0.1, 0.15, 0.25),
    });
    y -= 18;

    for (const para of section.paragraphs) {
      const lines = wrapLines(sanitizeWinAnsi(para), 86);
      for (const line of lines) {
        if (y < 90) {
          page = pdfDoc.addPage([595.28, 841.89]);
          y = height - margin;
        }
        page.drawText(line, {
          x: margin,
          y,
          size: 10,
          font: fontRegular,
          color: rgb(0.18, 0.22, 0.28),
        });
        y -= 14.5;
      }
      y -= 8;
    }
    y -= 8;
  }

  if (y < 140) {
    page = pdfDoc.addPage([595.28, 841.89]);
    y = height - margin;
  }

  y -= 10;
  page.drawLine({
    start: { x: margin, y },
    end: { x: width - margin, y },
    thickness: 0.75,
    color: rgb(0.82, 0.85, 0.9),
  });
  y -= 20;

  page.drawText('SÄHKÖINEN ALLEKIRJOITUS', {
    x: margin,
    y,
    size: 10,
    font: fontBold,
    color: rgb(0.1, 0.15, 0.25),
  });
  y -= 15;
  page.drawText(
    'Tämä sopimus allekirjoitetaan sähköisesti vahvaa tunnistautumista (FTN) käyttäen.',
    {
      x: margin,
      y,
      size: 9,
      font: fontRegular,
      color: rgb(0.35, 0.4, 0.47),
    }
  );
  y -= 13;
  page.drawText(
    'Virallinen allekirjoitustodistus aikaleimoineen liitetään asiakirjan viimeiseksi sivuksi.',
    {
      x: margin,
      y,
      size: 9,
      font: fontRegular,
      color: rgb(0.35, 0.4, 0.47),
    }
  );

  const pdfBytes = await pdfDoc.save();
  const safeName = `${template.slug}.pdf`;
  return new File([pdfBytes.buffer as ArrayBuffer], safeName, { type: 'application/pdf' });
}
