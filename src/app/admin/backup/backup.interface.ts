export interface Backup {
    backupId: string;
    nombreBackup: string;
    fechaHoraBackup: Date;
    respaldadoPor?: string;
    fechaRestauracion?: Date;
    restauradoPor?: string;
}
