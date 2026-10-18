namespace apps.dflc.expensemanager.entities;

using {
    cuid,
    managed,
} from '@sap/cds/common';

/**
 * E-mail (SMTP) server set by an admin. A single row; not exposed by any
 * service. The password is stored encrypted (AES-256-GCM with a key derived
 * from SETTINGS_SECRET) and never returned.
 */
entity EmailServers : cuid, managed {
    Host     : String(255);
    Port     : Integer;
    Username : String(255);
    Sender   : String(255);
    Password : String(1000);
}
