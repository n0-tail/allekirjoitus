# Allekirjoitus (Signature Service) 🖋️

Allekirjoitus on moderni, "serverless" Proof-of-Concept (PoC) sähköiselle allekirjoituspalvelulle. Se on suunniteltu huomioimaan tietosuoja sekä hyödyntämään pelkästään moderneja pilvipalveluita ja asiakkaan selainta raskaimpiin operaatioihin.

## Arkkitehtuuri & Nykyinen Tila

Palvelun ydintoiminnallisuudet ovat **tällä hetkellä jo täysin toteutettu** ja toimintakunnossa:

1. **Frontend**: React + TypeScript + Vite. Julkaistu automaattisesti GitHub Pagesiin.
2. **Storage & Database (Toteutettu)**: Supabase PostgreSQL -tietokanta ja Storage. Asiakirjat ladataan ensin S3-yhteensopivaan "pdfs"-buckettiin, ja niille luodaan tila-rivi `documents`-tauluun.
3. **Sähköpostien Lähetys (Toteutettu)**: Resend API + Supabase Edge Functions (`send-email`). Lähettää lähetysvaiheessa automaattisesti kutsulinkin vastaanottajalle, sekä allekirjoituksen jälkeen valmiin ladattavan PDF-linkin kummallekin osapuolelle.
4. **Vahva Tunnistautuminen (FTN / Criipto) (Toteutettu)**:
   - Integroitu Suomalainen Luottamusverkosto (FTN) pankkitunnuksilla (Criipton testiverkko).
   - Hyödyntää kahta uutta Edge Functionia (`init-auth` ja `auth-callback`) toteuttamaan FTN:n vaatimat korkeimman turvatason kryptografiset vaatimukset:
     - **PAR (Pushed Authorization Requests)**: Kirjautumispyynnöt allekirjoitetaan (JAR) ja pusketaan suoraan taustapalvelimen kautta.
     - **JWE (JSON Web Encryption)**: Asiakkaan henkilöllisyystodistus (id_token) vastaanotetaan vahvasti salattuna ja puretaan omilla RSA-avaimilla (jose-kirjastolla).
5. **PDF Leimaus selaimessa (Toteutettu)**: Autentikoinnin jälkeen palvelu hyödyntää `pdf-lib`-kirjastoa leimatakseen PDF-tiedoston visuaalisesti käyttäjän varmennetulla nimellä ja aikaleimalla suoraan selaimessa (välttäen näin raskaat PDF-palvelinkulut), jonka jälkeen se korvaa alkuperäisen tiedoston Supabasessa.

## Seuraavat askeleet oikeaksi tuotteeksi (Tuotantovalmius)

Vaikka putki toimii nyt visuaalisesti ja teknisesti end-to-end, seuraavat asiat puuttuvat vielä aidosta, juridisesti pitävästä SaaS-tuotteesta:

1. **Kryptografinen PDF Sertifikaattiallekirjoitus (PAdES)**: Tällä hetkellä sovellus piirtää allekirjoittajan nimen ja aikaleiman visuaalisesti PDF:n sivulle. Juridisesti vahvassa "Advanced Electronic Signature" (AES) -mallissa PDF:n sisään tulee upottaa palveluntarjoajan kryptografinen varmenne (esim. node-signpdf:n avulla).
2. **Tuotanto-FTN Avaimet**: Vaihda Criipton testiverkko (dfgdfgdfg-test.criipto.id) ja testipankkitunnukset oikeaan tuotantoverkkoon, tehden yrityksen ja käyttötarkoituksen varmentamisen Criiptolle.
3. **Automaattinen tiedostojen siivous (Cron)**: Poistaa PDF-tiedostot automaattisesti jatkuvan tallennustilan ja tietosuojariskien minimoimiseksi esimerkiksi 24 tunnin jälkeen (jotta "ephemeral pipeline" toteutuu täydellisesti).
4. **Tarkempi Audit Trail / Lokitus**: Laajempi tallennus IP-osoitteista, onnistuneista JWE/PAR FTN-transaktio-ID:istä ja selaimen user-agenteista erilliseksi tietokantatauluksi, joka mahdollisesti liitetään PDF:n viimeiseksi sivuksi "allekirjoituslokina".

## Paikallinen Kehitys

**Vaatimukset:**
Supabase-projekti, Resend API-avain ja Criipto-tili (FTN).
(Tässä repositoriossa on myös `mock-idura` palvelu, jolla FTN-tunnistautumista voi testata lokaalisti ilman oikeaa Criipto-yhteyttä `npm run mock-idura`).

1. Asenna riippuvuudet:
   ```bash
   npm install
   ```

2. Luo `.env.local` tiedosto:
   ```env
   VITE_SUPABASE_URL=your_supabase_project_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   # Edge Functionsille (salaisuudet asetetaan myös Supabase cloudeihin):
   IDURA_CLIENT_ID=...
   IDURA_DOMAIN=...
   ```

3. Käynnistä paikallinen palvelin:
   ```bash
   npm run dev
   ```
