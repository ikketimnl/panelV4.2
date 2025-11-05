import { Fragment, useEffect, useState } from 'react';
import { NavLink, Route, Routes, useParams, useLocation } from 'react-router-dom';
import classNames from 'classnames';
import {
    CogIcon,
    DesktopComputerIcon,
    PuzzleIcon,
    ReplyIcon,
} from '@heroicons/react/outline';

import TransferListener from '@/components/server/TransferListener';
import WebsocketHandler from '@/components/server/WebsocketHandler';
import InstallListener from '@/components/server/InstallListener';
import ConflictStateRenderer from '@/components/server/ConflictStateRenderer';
import SidebarControls from '@/components/server/console/SidebarControls';
import NavigationBar from '@/components/NavigationBar';
import Spinner from '@elements/Spinner';
import { NotFound, ServerError, Suspended } from '@elements/ScreenBlock';
import ErrorBoundary from '@elements/ErrorBoundary';
import PermissionRoute from '@elements/PermissionRoute';
import Sidebar from '@elements/Sidebar';
import MobileSidebar from '@elements/MobileSidebar';
import routes from '@/routers/routes';
import { usePersistedState } from '@/plugins/usePersistedState';
import { httpErrorToHuman } from '@/api/http';
import { useStoreState } from 'easy-peasy';
import { ServerContext, ServerStatus } from '@/state/server';

function statusToColor(status: ServerStatus): string {
    switch (status) {
        case 'running':
            return 'border-green-500';
        case 'offline':
            return 'border-red-500';
        case 'starting':
        case 'stopping':
            return 'border-yellow-500';
        default:
            return 'border-gray-500';
    }
}

function ServerRouter() {
    const params = useParams<'id'>();
    const location = useLocation();

    // Global store states
    const user = useStoreState(s => s.user.data!);
    const theme = useStoreState(s => s.theme.data!);
    const settings = useStoreState(s => s.settings.data!);
    const rootAdmin = user.rootAdmin;

    // Server context
    const getServer = ServerContext.useStoreActions(a => a.server.getServer);
    const clearServerState = ServerContext.useStoreActions(a => a.clearServerState);
    const server = ServerContext.useStoreState(s => s.server.data);
    const inConflictState = ServerContext.useStoreState(s => s.server.inConflictState);
    const status = ServerContext.useStoreState(s => s.status.value);

    const [error, setError] = useState('');
    const [collapsed, setCollapsed] = usePersistedState<boolean>(
        `sidebar_user_${user.uuid}`,
        false
    );

    const billable = server?.billingProductId;
    const categories = ['data', 'configuration'] as const;

    /** ─── Lifecycle ──────────────────────────────────────── */
    useEffect(() => {
        clearServerState();
    }, []);

    useEffect(() => {
        setError('');
        if (!params.id) return;

        getServer(params.id).catch(err => {
            console.error(err);
            setError(httpErrorToHuman(err));
        });

        return () => clearServerState();
    }, [params.id]);

    /** ─── Suspended / Billing ─────────────────────────────── */
    if (
        billable &&
        server?.renewalDate &&
        server.renewalDate.getTime() < Date.now()
    ) {
        return <Suspended id={server.billingProductId} date={server.renewalDate} />;
    }

    /** ─── Layout ─────────────────────────────────────────── */
    return (
        <Fragment key="server-router">
            <div className="h-screen flex">
                {/* ── Mobile Sidebar ─────────────────────────────── */}
                <MobileSidebar>
                    <MobileSidebar.Home />
                    {routes.server
                        .filter(route => route.name && (!route.condition || route.condition({ billable })))
                        .map(route => (
                            <MobileSidebar.Link
                                key={route.route}
                                icon={route.icon ?? PuzzleIcon}
                                text={route.name}
                                linkTo={route.path}
                                end={route.end}
                            />
                        ))}
                    {(user.rootAdmin || user.admin_role_id) && (
                        <MobileSidebar.Link icon={CogIcon} text="Admin" linkTo="/admin" />
                    )}
                </MobileSidebar>

                {/* ── Desktop Sidebar ────────────────────────────── */}
                <Sidebar className="flex-none" $collapsed={collapsed} theme={theme}>
                    <div
                        className="w-full flex flex-col items-center justify-center mt-1 mb-3 select-none cursor-pointer"
                        onClick={() => setCollapsed(!collapsed)}
                    >
                        {!collapsed ? (
                            <img
                                src={
                                    settings.logo?.toString() ||
                                    'https://ikketim.nl/wp-content/uploads/2025/11/BannerLogo3.png'
                                }
                                className="mt-4 w-full h-auto object-contain px-2"
                                alt="Logo"
                            />
                        ) : (
                            <img
                                src="https://ikketim.nl/wp-content/uploads/2025/09/cropped-ikketim-logo-new.png"
                                className="mt-4 w-12"
                                alt="Logo"
                            />
                        )}
                    </div>

                    <Sidebar.Wrapper theme={theme} className="mb-auto">
                        <NavLink to="/" end className="mb-[18px]">
                            <DesktopComputerIcon />
                            <span>Dashboard</span>
                        </NavLink>

                        {server?.uuid && (
                            <Sidebar.Section>
                                Server {server.uuid.slice(0, 8)}
                            </Sidebar.Section>
                        )}

                        {/* General routes */}
                        {routes.server
                            .filter(
                                r =>
                                    !r.category &&
                                    r.name &&
                                    (!r.condition || r.condition({ billable }))
                            )
                            .map(route => (
                                <NavLink
                                    to={route.path}
                                    key={route.path}
                                    end={route.end}
                                >
                                    <Sidebar.Icon icon={route.icon ?? PuzzleIcon} />
                                    <span>{route.name}</span>
                                </NavLink>
                            ))}

                        {/* Categorized routes */}
                        {categories.map(category => {
                            const categoryRoutes = routes.server.filter(
                                r => r.category === category && r.name
                            );
                            if (!categoryRoutes.length) return null;

                            return (
                                <Fragment key={category}>
                                    <Sidebar.Section>
                                        {category.charAt(0).toUpperCase() + category.slice(1)}
                                    </Sidebar.Section>
                                    {categoryRoutes.map(route => (
                                        <NavLink
                                            to={route.path}
                                            key={route.path}
                                            end={route.end}
                                        >
                                            <Sidebar.Icon icon={route.icon ?? PuzzleIcon} />
                                            <span>{route.name}</span>
                                        </NavLink>
                                    ))}
                                </Fragment>
                            );
                        })}

                        {/* Admin shortcut */}
                        {user.rootAdmin && server?.internalId && (
                            <NavLink to={`/admin/servers/${server.internalId}`}>
                                <ReplyIcon />
                                <span>View as Admin</span>
                            </NavLink>
                        )}
                    </Sidebar.Wrapper>

                    <Sidebar.User
                        className={classNames('border-t', statusToColor(status))}
                    >
                        {server && <SidebarControls />}
                    </Sidebar.User>
                </Sidebar>

                {/* ── Main Content Area ─────────────────────────── */}
                {!server?.uuid || !server?.id ? (
                    error ? (
                        <ServerError message={error} />
                    ) : (
                        <Spinner size="large" centered />
                    )
                ) : (
                    <div className="flex-1 overflow-x-hidden">
                        <InstallListener />
                        <TransferListener />
                        <WebsocketHandler />
                        <NavigationBar />

                        {inConflictState &&
                        (!rootAdmin ||
                            (rootAdmin &&
                                !location.pathname.endsWith(`/server/${server.id}`))) ? (
                            <ConflictStateRenderer />
                        ) : (
                            <ErrorBoundary>
                                <Routes location={location}>
                                    {routes.server.map(
                                        ({ route, permission, component: Component }) => (
                                            <Route
                                                key={route}
                                                path={route}
                                                element={
                                                    <PermissionRoute permission={permission}>
                                                        <Spinner.Suspense>
                                                            <Component />
                                                        </Spinner.Suspense>
                                                    </PermissionRoute>
                                                }
                                            />
                                        )
                                    )}
                                    <Route path="*" element={<NotFound />} />
                                </Routes>
                            </ErrorBoundary>
                        )}
                    </div>
                )}
            </div>
        </Fragment>
    );
}

export default ServerRouter;
