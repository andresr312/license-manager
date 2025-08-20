import crypto from 'crypto';

export class LicenseGenerator {
  private static readonly BASE64_KEY = "dGhpc2lzMTZieXRlc2tleQ==";
  private static readonly BASE64_IV = "a1b2c3d4e5f6g7h8";

  private static getKey(): Buffer {
    return Buffer.from(this.BASE64_KEY, 'base64');
  }

  private static getIV(): Buffer {
    return Buffer.from(this.BASE64_IV, 'utf8');
  }

  private static encryptLicense(plainText: string): Buffer {
    const cipher = crypto.createCipheriv('aes-128-cbc', this.getKey(), this.getIV());
    let encrypted = cipher.update(plainText, 'utf8');
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    return encrypted;
  }

  private static decodeLicense(encodedLicense: string): string {
    const cleanEncoded = encodedLicense.replace(/-/g, '');
    const encryptedBytes = Buffer.from(cleanEncoded, 'base64');
    const decipher = crypto.createDecipheriv('aes-128-cbc', this.getKey(), this.getIV());
    let decrypted = decipher.update(encryptedBytes);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString('utf8');
  }

  static encode(data: Buffer): string {
    return data.toString('base64');
  }

  static generateLicense(
    fecha: string,
    rif: string,
    nombreNegocio: string,
    direccion1: string,
    direccion2: string,
    direccion3: string,
    direccion4: string,
    adminPassword: string,
    licenseType: string,
    hardwareId: string,
    creationDate: string
  ): string {
    const plain = `${fecha}|${rif}|${nombreNegocio}|${direccion1}|${direccion2}|${direccion3}|${direccion4}|${adminPassword}|${licenseType}|${hardwareId}|${creationDate}|TRUESIGNED`;
    const encrypted = this.encryptLicense(plain);
    return this.encode(encrypted);
  }

  static decryptLicense(encodedLicense: string): string[] {
    const decrypted = this.decodeLicense(encodedLicense);
    return decrypted.split('|');
  }
}
