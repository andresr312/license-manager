import type { License } from '@shared/schema';

export class DiscordNotifier {
  private static readonly WEBHOOK_URL = "https://discord.com/api/webhooks/1407803911649230879/6eYdp2hElDxMFWmD71wNuubp-unKy4HDCNEcIrEi7h1WH85IL3ex8nSb00ralOM15BFq";

  private static async postToDiscord(payload: any): Promise<void> {
    try {
      const response = await fetch(this.WEBHOOK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
      
      console.log(`Discord response: ${response.status} -> ${response.statusText}`);
      if (!response.ok) {
        console.error('Discord webhook error:', await response.text());
      }
    } catch (error) {
      console.error('Failed to send Discord notification:', error);
    }
  }

  static async sendLicenseCreated(license: License): Promise<void> {
    const expirationDate = new Date(license.expirationEpochDay * 24 * 60 * 60 * 1000).toLocaleDateString();
    
    const embed = {
      title: license.businessName,
      description: "Licencia creada",
      color: 5763719, // blue
      fields: [
        { name: "RIF", value: license.rif, inline: true },
        { name: "Expira", value: expirationDate, inline: true },
        { name: "Tipo", value: license.licenseType, inline: true },
        { name: "Hardware ID", value: license.hardwareId || "N/A", inline: true },
        { name: "Monto", value: `$${license.cost}`, inline: true },
      ]
    };

    const payload = {
  content: `🆕 **Licencia creada: $${license.cost}**`,
      embeds: [embed]
    };

    await this.postToDiscord(payload);
  }

  static async sendLicenseRenewed(oldLicense: License, newLicense: License): Promise<void> {
    const oldExpiration = new Date(oldLicense.expirationEpochDay * 24 * 60 * 60 * 1000).toLocaleDateString();
    const newExpiration = new Date(newLicense.expirationEpochDay * 24 * 60 * 60 * 1000).toLocaleDateString();
    
    const embed = {
      title: newLicense.businessName,
  description: `Renovación: $${newLicense.cost}`,
      color: 16776960, // yellow
      fields: [
        { name: "RIF", value: newLicense.rif, inline: true },
        { name: "Expiración Anterior", value: oldExpiration, inline: true },
        { name: "Nueva Expiración", value: newExpiration, inline: true },
        { name: "Monto", value: `$${newLicense.cost}`, inline: true },
      ]
    };

    const payload = {
  content: `🔄 **Licencia renovada: $${newLicense.cost}**`,
      embeds: [embed]
    };

    await this.postToDiscord(payload);
  }

  static async sendLicenseExpiring(license: License, daysRemaining: number): Promise<void> {
    const expirationDate = new Date(license.expirationEpochDay * 24 * 60 * 60 * 1000).toLocaleDateString();
    
    const embed = {
      title: license.businessName,
      description: `⚠️ Licencia próxima a vencer en ${daysRemaining} días`,
      color: 16711680, // red
      fields: [
        { name: "RIF", value: license.rif, inline: true },
        { name: "Expira", value: expirationDate, inline: true },
        { name: "Tipo", value: license.licenseType, inline: true },
      ]
    };

    const payload = {
      content: "⚠️ **Licencia próxima a vencer**",
      embeds: [embed]
    };

    await this.postToDiscord(payload);
  }
}
