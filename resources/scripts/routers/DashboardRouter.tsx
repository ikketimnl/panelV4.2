import { Suspense, useEffect, useState } from 'react';
import { NavLink, Route, Routes } from 'react-router-dom';
import DashboardContainer from '@/components/dashboard/DashboardContainer';
import { NotFound } from '@elements/ScreenBlock';
import Spinner from '@elements/Spinner';
import routes from '@/routers/routes';
import { useStoreState } from '@/state/hooks';
import { usePersistedState } from '@/plugins/usePersistedState';
import Sidebar from '@elements/Sidebar';
import {
    CogIcon,
    DesktopComputerIcon,
    ExternalLinkIcon,
    LogoutIcon,
    PuzzleIcon,
} from '@heroicons/react/outline';
import Avatar from '@/components/Avatar';
import MobileSidebar from '@elements/MobileSidebar';
import { CustomLink } from '@/api/admin/links';
import { getLinks } from '@/api/getLinks';
import http from '@/api/http';
import NavigationBar from '@/components/NavigationBar';

function DashboardRouter() {
    const user = useStoreState(s => s.user.data!);
    const settings = useStoreState(s => s.settings.data!);
    const theme = useStoreState(s => s.theme.data!);
    const flags = useStoreState(s => s.everest.data!);

    const [links, setLinks] = useState<CustomLink[] | null>(null);
    const [collapsed, setCollapsed] = usePersistedState<boolean>(
        `sidebar_user_${user.uuid}`,
        false
    );

    useEffect(() => {
        getLinks()
            .then(setLinks)
            .catch(err => console.error('Failed to load custom links:', err));
    }, []);

    const handleLogout = () => {
        http.post('/auth/logout').finally(() => {
            window.location.href = '/';
        });
    };

    const accountRoutes = routes.account.filter(
        route => route.name && (!route.condition || route.condition(flags))
    );

    const adminVisible = user.rootAdmin || user.admin_role_id;

    return (
        <div className="h-screen flex">
            {/* Mobile Sidebar */}
            <MobileSidebar>
                <MobileSidebar.Home />
                {accountRoutes.map(route => (
                    <MobileSidebar.Link
                        key={route.route}
                        icon={route.icon ?? PuzzleIcon}
                        text={route.name}
                        linkTo={route.path ? `/account/${route.path}` : ''}
                        end={route.end}
                    />
                ))}
                {adminVisible && (
                    <MobileSidebar.Link icon={CogIcon} text="Admin" linkTo="/admin" />
                )}
            </MobileSidebar>

            {/* Desktop Sidebar */}
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

                <Sidebar.Wrapper theme={theme}>
                    <NavLink to="/" end className="mb-[18px]">
                        <DesktopComputerIcon />
                        <span>Dashboard</span>
                    </NavLink>

                    {accountRoutes.map(route => (
                        <NavLink
                            to={`/account/${route.path}`}
                            key={route.path}
                            end={route.end}
                        >
                            <Sidebar.Icon icon={route.icon ?? PuzzleIcon} />
                            <span>{route.name}</span>
                        </NavLink>
                    ))}
                </Sidebar.Wrapper>

                <div className="mt-auto mb-3 mr-auto">
                    {!collapsed && links && (
                        <>
                            {links.map(link => (
                                <a
                                    key={link.id}
                                    href={link.url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="flex items-center gap-2 px-3 py-1 hover:text-white/80"
                                >
                                    <ExternalLinkIcon className="w-4 h-4" />
                                    <span>{link.name}</span>
                                </a>
                            ))}
                        </>
                    )}

                    {adminVisible && (
                        <NavLink to="/admin" className="flex items-center gap-2 px-3 py-1">
                            <CogIcon className="w-4 h-4" />
                            {!collapsed && <span>Settings</span>}
                        </NavLink>
                    )}

                    <button
                        onClick={handleLogout}
                        className="flex items-center gap-2 px-3 py-1 text-left w-full"
                    >
                        <LogoutIcon className="w-4 h-4" />
                        {!collapsed && <span>Logout</span>}
                    </button>
                </div>

                <Sidebar.User>
                    <div className="flex items-center">
                        <Avatar.User />
                        {!collapsed && (
                            <div className="flex flex-col ml-3">
                                <div className="text-gray-400 text-sm">Welcome back,</div>
                                <span className="font-sans text-xs text-gray-300 whitespace-nowrap">
                                    {user.email}
                                </span>
                            </div>
                        )}
                    </div>
                </Sidebar.User>
            </Sidebar>

            {/* Main Content Area */}
            <div className="flex-1 overflow-x-hidden">
                <NavigationBar />
                <Suspense fallback={<Spinner centered />}>
                    <Routes>
                        <Route path="" element={<DashboardContainer />} />
                        {accountRoutes.map(({ route, component: Component }) => (
                            <Route
                                key={route}
                                path={`/account/${route}`.replace(/\/$/, '')}
                                element={<Component />}
                            />
                        ))}
                        <Route path="*" element={<NotFound />} />
                    </Routes>
                </Suspense>
            </div>
        </div>
    );
}

export default DashboardRouter;
