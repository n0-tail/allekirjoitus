export interface Article {
  slug: string;
  title: string;
  description: string;
  date: string;
  content: string; // Markdown / HTML content
}

export const articles: Article[] = [
  {
    slug: 'mika-on-sahkoinen-allekirjoitus',
    title: 'Mikä on sähköinen allekirjoitus ja miten se toimii?',
    description: 'Opas sähköisen allekirjoituksen lainmukaisuuteen, EU:n eIDAS-asetukseen ja vahvaan pankkitunnistautumiseen (FTN) Suomessa.',
    date: '2026-08-17',
    content: `
      <h2>Sähköisen allekirjoituksen perusteet</h2>
      <p>Sähköinen allekirjoitus on juridisesti pätevä tapa vahvistaa sopimus tai asiakirja verkossa ilman tulostamista, kynää tai skannausta. Suomessa luotettavin ja yleisimmin käytetty tapa on vahvaan sähköiseen tunnistamiseen perustuva allekirjoitus, jossa allekirjoittajan henkilöllisyys varmistetaan pankkitunnuksilla tai mobiilivarmenteella.</p>

      <h2>eIDAS-asetus ja sopimusten muotovaatimukset Suomessa</h2>
      <p>Euroopan unionissa sähköisiä allekirjoituksia säätelee <strong>eIDAS-asetus</strong> (EU 910/2014). Asetuksen 25 artiklan mukaan sähköiseltä allekirjoitukselta ei voida evätä oikeusvaikutuksia tai tutkittavaksi ottamista todisteena oikeudellisissa menettelyissä pelkästään sillä perusteella, että se on sähköisessä muodossa.</p>
      <p>Suomen oikeusjärjestelmässä vallitsee sopimusvapaus ja muotovapaus: valtaosa sopimuksista — kuten asuinhuoneiston vuokrasopimukset, työsopimukset, velkakirjat, valtakirjat, osakassopimukset ja irtaimen omaisuuden kauppakirjat — voidaan solmia täysin pätevästi sähköisesti. Vahvalla tunnistautumisella tehty allekirjoitus on riitatilanteessa huomattavasti helpommin todistettavissa kuin perinteinen kynällä tehty nimikirjoitus, sillä jokaisesta tunnistautumisesta jää tarkka aikaleima ja lokimerkintä.</p>

      <h2>Vahva pankkitunnistautuminen (Finnish Trust Network, FTN)</h2>
      <p>Suomessa vahvaa sähköistä tunnistamista valvoo Liikenne- ja viestintävirasto <strong>Traficom</strong>. Pankkitunnistautuminen (OP, Nordea, Danske Bank, S-Pankki, Säästöpankki, POP Pankki, Aktia ja Ålandsbanken) kuuluu luottamusverkostoon (FTN).</p>
      <p>Kun asiakirja allekirjoitetaan pankkitunnuksilla, allekirjoittajan virallinen nimi haetaan suoraan tunnistusvälittäjän rekisteristä. Pelkkään sähköpostiosoitteeseen tai hiirellä piirrettyyn nimikirjoitukseen verrattuna FTN-tunnistautuminen estää tehokkaasti väärällä nimellä esiintymisen.</p>

      <h2>Miten allekirjoitusprosessi etenee käytännössä?</h2>
      <ol>
        <li><strong>PDF-asiakirjan valinta:</strong> Lähettäjä lataa valmiin PDF-sopimuksen omalta laitteeltaan tai täyttää valmiin <a href="/sopimuspohjat">sopimuspohjan</a> suoraan selaimessa.</li>
        <li><strong>Osapuolten sähköpostit:</strong> Lähettäjä syöttää oman sähköpostiosoitteensa ja mahdollisten muiden allekirjoittajien sähköpostiosoitteet.</li>
        <li><strong>Pankkitunnistautuminen ja allekirjoitustodistus:</strong> Osapuolet tunnistautuvat pankkitunnuksillaan. Kun kaikki ovat valmiita, järjestelmä liittää PDF-asiakirjaan virallisen allekirjoitustodistuksen, SHA-256-tiivisteen ja QR-tarkistuskoodin.</li>
        <li><strong>Toimitus ja automaattinen poisto:</strong> Valmis PDF toimitetaan kaikkien osapuolten sähköpostiin, ja asiakirja poistetaan palvelimelta automaattisesti 24 tunnin kuluessa valmistumisesta.</li>
      </ol>
    `
  },
  {
    slug: 'sahkoinen-allekirjoitus-vuokrasopimukseen',
    title: 'Sähköinen allekirjoitus vuokrasopimukseen – Ohje vuokranantajalle',
    description: 'Miten allekirjoitat vuokrasopimuksen sähköisesti pankkitunnuksilla ilman kuukausimaksuja? Käytännön ohje yksityisille vuokranantajille ja asuntosijoittajille.',
    date: '2026-08-17',
    content: `
      <h2>Vuokrasopimuksen tekeminen sähköisesti</h2>
      <p>Asuinhuoneiston vuokrasopimus (laki asuinhuoneiston vuokrauksesta 481/1995) on yksi yleisimmistä sopimuksista, joka allekirjoitetaan verkossa. Sähköinen allekirjoitus säästää sekä vuokranantajan että vuokralaisen aikaa, kun sopimuksen voi vahvistaa etänä heti vuokralaisvalinnan jälkeen.</p>

      <h2>Miksi pankkitunnistautuminen (FTN) on tärkeää vuokrasopimuksessa?</h2>
      <p>Vuokrasuhteessa osapuolten henkilöllisyyden varmistaminen on ensiarvoisen tärkeää. Pelkkä sähköpostivahvistus tai ruudulle piirrettävä allekirjoitus ei varmista, kuka sopimuksen todellisuudessa hyväksyy.</p>
      <p>Vahva pankkitunnistautuminen (FTN) hakee allekirjoittajan virallisen nimen suoraan pankilta ja liittää sen PDF-vuokrasopimuksen allekirjoitustodistukseen aikaleiman ja IP-tunnisteen kera. Tämä täyttää lain edellyttämän kirjallisen muodon ja tarjoaa vahvan todistusvoiman.</p>

      <h2>Kertamaksu vs. kuukausimaksulliset palvelut</h2>
      <p>Monet yrityksille suunnatut allekirjoituspalvelut vaativat jatkuvan kuukausitilauksen (esim. 15–30 €/kk). Yksityiselle vuokranantajalle tai muutaman sijoitusasunnon omistajalle kuukausimaksu on tarpeeton kulu, jos uusia vuokrasopimuksia tehdään vain kerran tai pari vuodessa.</p>
      <p>Helppo Allekirjoitus toimii kertamaksulla (<strong>1,49 € / allekirjoittaja</strong>) ilman rekisteröitymistä tai tilausvelvoitteita. Vuokranantaja voi halutessaan maksaa molempien osapuolten kulut (yht. 2,98 €) yhdellä kertaa, jolloin vuokralainen pääsee suoraan tunnistautumaan pankkitunnuksillaan.</p>

      <h2>Näin allekirjoitat vuokrasopimuksen 5 minuutissa:</h2>
      <ol>
        <li>Laadi vuokrasopimus PDF-muotoon — voit käyttää omaa pohjaasi tai täyttää <a href="/sopimuspohjat/asuinhuoneiston-vuokrasopimus">ilmaisen vuokrasopimuspohjan</a> suoraan sivustollamme.</li>
        <li>Valitse PDF-tiedosto <a href="/">etusivun</a> lomakkeelle.</li>
        <li>Syötä oma sähköpostiosoitteesi (Allekirjoittaja 1) ja vuokralaisen sähköpostiosoite (Allekirjoittaja 2).</li>
        <li>Maksa käsittelymaksu ja tunnistaudu pankkitunnuksillasi.</li>
        <li>Vuokralainen saa sähköpostiinsa kutsun, tunnistautuu omilla pankkitunnuksillaan, ja molemmat saavat valmiin, allekirjoitustodistuksella varustetun PDF-sopimuksen sähköpostiinsa.</li>
      </ol>
    `
  },
  {
    slug: 'sahkoinen-allekirjoitus-hintavertailu',
    title: 'Sähköisen allekirjoituksen hinta: Kuukausitilaus vai kertamaksu?',
    description: 'Vertailussa sähköisten allekirjoituspalveluiden hinnoittelumallit Suomessa (Visma Sign, DocuSign ja Helppo Allekirjoitus). Milloin kertamaksu kannattaa?',
    date: '2026-08-17',
    content: `
      <h2>Sähköisten allekirjoituspalveluiden hinnoittelumallit Suomessa</h2>
      <p>Sähköisen allekirjoituksen markkina jakautuu kahteen selkeästi erilaiseen tarpeeseen: suuren volyymin yritysratkaisuihin (joissa sopimuksia hallinnoidaan ja arkistoidaan satoja vuodessa) sekä satunnaiseen käyttöön, jossa yksityishenkilö, yhdistys tai pienyritys tarvitsee virallisen pankkitunnistautumisen yksittäiseen PDF-sopimukseen.</p>

      <h2>1. Kansainväliset alustat (esim. DocuSign, Adobe Acrobat Sign)</h2>
      <p>Kansainväliset ohjelmistot sopivat erinomaisesti monikansallisille yrityksille, jotka tarvitsevat englanninkielisen käyttöliittymän ja valmiit CRM-integraatiot.</p>
      <ul>
        <li><strong>Hinnoittelu:</strong> Kuukausi- tai vuositilaus (tyypillisesti 10–35 € / käyttäjä / kk).</li>
        <li><strong>Tunnistautuminen Suomessa:</strong> Oletuksena sähköpostipohjainen allekirjoitus; suomalainen vahva pankkitunnistautuminen (FTN) vaatii yleensä erillisen yrityslaajennuksen ja lisämaksun per tunnistautuminen.</li>
      </ul>

      <h2>2. Pohjoismaiset yritysratkaisut (esim. Visma Sign, Scrive)</h2>
      <p>Pohjoismaiset palvelut tarjoavat suomalaisen FTN-pankkitunnistautumisen ja verkkopohjaisen sopimusarkiston yritysten jatkuvaan käyttöön.</p>
      <ul>
        <li><strong>Hinnoittelu:</strong> Usein kuukausi- tai vuosimaksu tai ennakkoon ostettava krediittipaketti yritystiliä varten, minkä päälle veloitetaan tapahtumakohtainen hinta.</li>
        <li><strong>Kenelle sopii:</strong> Yrityksille, tilitoimistoille ja isännöitsijöille, jotka lähettävät kymmeniä tai satoja sopimuksia kuukaudessa ja tarvitsevat keskitetyn arkiston.</li>
      </ul>

      <h2>3. Kertamaksullinen pankkitunnistautuminen (Helppo Allekirjoitus)</h2>
      <p>Helppo Allekirjoitus on rakennettu tilanteisiin, joissa et halua perustaa käyttäjätiliä, sitoutua kuukausimaksuihin tai säilyttää sopimuksiasi ulkopuolisessa pilviarkistossa.</p>
      <ul>
        <li><strong>Hinta:</strong> Kiinteä <strong>1,49 € per allekirjoittaja</strong> (sis. ALV 25,5 %). Kahden osapuolen sopimus maksaa yhteensä 2,98 €.</li>
        <li><strong>Ei kuukausimaksua tai rekisteröitymistä:</strong> Maksat vain silloin, kun allekirjoitat asiakirjan.</li>
        <li><strong>Sisältää vahvan FTN-tunnistautumisen:</strong> Hinta sisältää suomalaisen pankkitunnistautumisen ja virallisen allekirjoitustodistuksen.</li>
        <li><strong>Automaattinen 24 h poisto:</strong> Valmis PDF-sopimus toimitetaan osapuolten omaan sähköpostiin ja poistetaan palvelimilta automaattisesti 24 tunnin kuluessa.</li>
      </ul>

      <h2>Yhteenveto: Kumpi malli kannattaa valita?</h2>
      <p>Jos yrityksesi lähettää sopimuksia päivittäin ja tarvitsee käyttäjäryhmien hallinnan sekä pysyvän pilviarkiston, kuukausimaksullinen yritysratkaisu on perusteltu valinta. Jos taas tarvitset virallisen, pankkitunnuksilla vahvistetun allekirjoituksen yksittäiseen vuokrasopimukseen, kauppakirjaan, valtakirjaan tai pienyrityksen sopimukseen, 1,49 € kertamaksu säästää sekä aikaa että satoja euroja vuodessa.</p>
    `
  }
];
