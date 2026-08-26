import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const WELCOME_MESSAGES: Record<string, string> = {
  ar: `مرحباً، أهلاً وسهلاً بكم في نعامنة للصرافة\nيرجى اختيار الخدمة المطلوبة:\n1. شراء عملة أجنبية\n2. بيع عملة أجنبية\n3. تحويل أموال للخارج\n4. دفع فواتير\n5. كرت الدفع المسبق (כרטיס נטען)\n6. أخرى`,
  he: `שלום וברוכים הבאים לנעאמנה להמרות\nאנא בחרו את השירות המבוקש:\n1. קניית מטבע חוץ\n2. מכירת מטבע חוץ\n3. העברת כסף לחו"ל\n4. תשלום חשבונות\n5. כרטיס נטען\n6. אחר`,
  en: `Hello and welcome to Naamneh Exchange\nPlease select the service you need:\n1. Buy foreign currency\n2. Sell foreign currency\n3. International money transfer\n4. Bill payments\n5. Prepaid card (Kart Neta)\n6. Other`,
};

function normalizePhone(raw: string): string | null {
  let digits = raw.replace(/\D/g, "");
  if (digits.startsWith("0")) digits = "972" + digits.slice(1);
  if (digits.startsWith("972")) return digits;
  if (digits.length === 9 && !digits.startsWith("972")) return "972" + digits;
  return null;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { phone_number, language = "ar", shop_username } = await req.json();

    if (!phone_number) {
      return new Response(
        JSON.stringify({ error: "phone_number is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const normalizedPhone = normalizePhone(phone_number);
    if (!normalizedPhone) {
      return new Response(
        JSON.stringify({ error: "Invalid phone number format" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const lang = (["ar", "he", "en"].includes(language) ? language : "ar") as keyof typeof WELCOME_MESSAGES;
    const messageContent = WELCOME_MESSAGES[lang];

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: logRow } = await supabase
      .from("whatsapp_welcome_messages")
      .insert({
        phone_number: normalizedPhone,
        language: lang,
        message_content: messageContent,
        status: "pending",
        shop_username: shop_username || null,
      })
      .select()
      .single();

    const token = Deno.env.get("WHATSAPP_ACCESS_TOKEN");
    const phoneNumberId = Deno.env.get("WHATSAPP_PHONE_NUMBER_ID");

    if (!token || !phoneNumberId) {
      const errMsg = "WhatsApp API credentials not configured. Set WHATSAPP_ACCESS_TOKEN and WHATSAPP_PHONE_NUMBER_ID as edge function secrets.";
      if (logRow) {
        await supabase
          .from("whatsapp_welcome_messages")
          .update({ status: "failed", error_message: errMsg })
          .eq("id", logRow.id);
      }
      return new Response(
        JSON.stringify({ error: errMsg }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const waResponse = await fetch(
      `https://graph.facebook.com/v20.0/${phoneNumberId}/messages`,
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: normalizedPhone,
          type: "text",
          text: { body: messageContent },
        }),
      }
    );

    const waData = await waResponse.json();

    if (!waResponse.ok) {
      const errorMsg = waData?.error?.message || `WhatsApp API returned ${waResponse.status}`;
      if (logRow) {
        await supabase
          .from("whatsapp_welcome_messages")
          .update({ status: "failed", error_message: errorMsg })
          .eq("id", logRow.id);
      }
      return new Response(
        JSON.stringify({ error: errorMsg }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const waMessageId = waData?.messages?.[0]?.id || null;
    if (logRow) {
      await supabase
        .from("whatsapp_welcome_messages")
        .update({ status: "sent", whatsapp_message_id: waMessageId })
        .eq("id", logRow.id);
    }

    return new Response(
      JSON.stringify({ success: true, message_id: waMessageId }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
