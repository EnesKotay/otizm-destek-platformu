package com.autismsupport.platform.model;

/**
 * KVKK kapsamında ayrı ayrı alınması gereken rıza türleri.
 * Açık rıza "belirli bir konuya ilişkin" olmak zorundadır (md. 3/1-a);
 * bu yüzden tek bir toplu onay yerine amaç bazlı ayrılmıştır.
 */
public enum ConsentType {
    /** Aydınlatma metninin okunduğu ve genel işlemeye rıza gösterildiği kayıt. */
    KVKK_AYDINLATMA,
    /** Çocuğun sağlık/gelişim verisinin yapay zekâ sağlayıcısına aktarılması (yurt dışı). */
    AI_ANALIZ,
    /** Acil durum kartının bağlantı ile üçüncü kişilere gösterilmesi. */
    ACIL_DURUM_KARTI,
    /** Benzer aile eşleştirmesinde profilin diğer ailelere gösterilmesi. */
    ESLESTIRME,
    /** Zorunlu olmayan bilgilendirme/pazarlama e-postaları. */
    PAZARLAMA_ILETISIMI
}
