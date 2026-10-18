import '../configs/module-alias';
import cds from '@sap/cds';
import { AdminError, UserAdministration } from '../auth/UserAdministration';
import { EmailServerAdministration } from '../auth/EmailServerAdministration';

type Handler = (data: any, actor: string, locale: string) => Promise<unknown>;

const ACTIONS: Record<string, Handler> = {
    CreateUser: (data, actor) => UserAdministration.createUser(data.Email, data.Name, data.Password, data.Role, actor),
    ApproveUser: (data) => UserAdministration.approve(data.UserId),
    SetUserStatus: (data, actor) => UserAdministration.setStatus(data.UserId, data.Status, actor),
    SetUserRole: (data, actor) => UserAdministration.setRole(data.UserId, data.Role, actor),
    ResetUserPassword: (data) => UserAdministration.resetPassword(data.UserId, data.Password),
    EmailServer: () => EmailServerAdministration.info(),
    SaveEmailServer: (data, actor) => EmailServerAdministration.save(data, actor),
    RemoveEmailServer: (_data, actor) => EmailServerAdministration.remove(actor),
    SendTestEmail: (data, _actor, locale) => EmailServerAdministration.sendTest(data.Recipient, locale)
};

/**
 * Admin actions on the app users. Business rules live in UserAdministration;
 * its errors become translated 4xx answers (srv/_i18n/messages*.properties).
 */
class AdminService extends cds.ApplicationService {

    init(): Promise<void> {

        Object.entries(ACTIONS).forEach(([action, handler]) => {
            this.on(action, async (req) => {
                try {
                    return await handler(req.data, req.user.id, req.locale || '');
                } catch (error) {
                    if (error instanceof AdminError) {
                        return req.reject(error.status, `error.admin.${error.code}`, [error.detail]);
                    }
                    throw error;
                }
            });
        });

        return super.init();

    }

}

module.exports = AdminService;
