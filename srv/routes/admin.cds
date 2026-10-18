using {apps.dflc.expensemanager.entities as entities} from '../../db/entities';

/**
 * Administration of the app users. Only admins (Users.Role = 'Admin') reach
 * it; password hashes and e-mail link tokens are never exposed.
 */
@path    : '/service/Admin'
@requires: 'Admin'
service AdminService {

    @readonly
    entity Users as projection on entities.Users {
        ID,
        Email,
        Name,
        Role,
        Status,
        MustChangePassword,
        LastLoginAt,
        createdAt,
        case
            when PasswordHash is null
                 then false
            else true
        end as HasPassword : Boolean
    };

    type EmailServerInfo {
        Host             : String;
        Port             : Integer;
        Username         : String;
        Sender           : String;
        Saved            : Boolean;
        PasswordReadable : Boolean;
        Source           : String;
    }

    function EmailServer()                                                                          returns EmailServerInfo;
    action   SaveEmailServer(Host: String, Port: Integer, Username: String, Sender: String, Password: String);
    action   RemoveEmailServer();
    action   SendTestEmail(Recipient: String);

    action CreateUser(Email: String, Name: String, Password: String, Role: String);
    action ApproveUser(UserId: UUID);
    action SetUserStatus(UserId: UUID, Status: String);
    action SetUserRole(UserId: UUID, Role: String);
    action ResetUserPassword(UserId: UUID, Password: String);

}
