/** REGEX patterns **/
export const numericPattern: string = '^[0-9]*$';
export const alphanumericPattern: string = '^([a-zA-Z\u00f1\u00d1À-ÿ0-9]+)( [a-zA-Z\u00f1\u00d1À-ÿ0-9]+)*$';
export const usernamePattern: string = '^([a-zA-Z\u00f1\u00d1À-ÿ0-9-_@:.\.\+\*\/\;\,\=\?\¿\~]+)( [a-zA-Z\u00f1\u00d1À-ÿ0-9-_@:\.\+\*\/\;\,\=\?\¿\~]+)*$';
export const namePattern: string = '^([a-zA-Z0-9\u00f1\u00d1À-ÿ.,]+)( [a-zA-Z0-9\u00f1\u00d1À-ÿ.,]+)*$';
export const phonePattern: string = '^[+]*[(]{0,1}[0-9]{1,4}[)]{0,1}[-\s\./0-9]*$';
export const emailPattern: string = '^[a-zA-Z\u00f1\u00d1À-ÿ0-9._%+-]+@[a-zA-Z\u00f1\u00d1À-ÿ0-9.-]+\\.[a-zA-Z\u00f1\u00d1À-ÿ]{2,4}$';
export const hexaColorPattern: string = "^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$";
export const floatPattern: string = "[+-]?([0-9]*[.])?[0-9]+$";
export const backupNamePattern: string = '^[a-zA-Z0-9-_]+$';
