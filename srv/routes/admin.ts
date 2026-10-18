import '../configs/module-alias';
import cds from '@sap/cds';
import { AdminError, UserAdministration } from '../auth/UserAdministration';

type Handler = (data: any, actor: string) => Promise<void>;

const ACTIONS: Record<string, Handler> = {
    CreateUser: (data, actor) => UserAdministration.createUser(data.Email, data.Name, data.Password, data.Role, actor),
    ApproveUser: (data) => UserAdministration.approve(data.UserId),
    SetUserStatus: (data, actor) => UserAdministration.setStatus(data.UserId, data.Status, actor),
    SetUserRole: (data, actor) => UserAdministration.setRole(data.UserId, data.Role, actor),
    ResetUserPassword: (data) => UserAdministration.resetPassword(data.UserId, data.Password)
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
                    await handler(req.data, req.user.id);
                } catch (error) {
                    if (error instanceof AdminError) {
                        return req.reject(error.status, `error.admin.${error.code}`);
                    }
                    throw error;
                }
            });
        });

        return super.init();

    }

}

module.exports = AdminService;
