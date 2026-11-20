import {
  getRouteApi,
  Link,
  Outlet,
  useMatchRoute,
} from '@tanstack/react-router';
import {
  Activity,
  LayoutDashboard,
  MapIcon,
  TriangleAlert,
  Radio,
} from 'lucide-react';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import { NavUser } from '@/components/nav-user';
import { ThemeToggle } from '@/components/theme-toggle';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Wordmark } from '@/components/wordmark';
import { useRealtimeConnection } from '@/hooks/use-realtime';

const route = getRouteApi('/dashboard/_app');

// Order follows the wireframe's sidebar. fuzzy keeps an item active on its child
// pages (an open report under Incidents); Home must match exactly.
const navItems = [
  { to: '/dashboard', label: 'Home', icon: LayoutDashboard, fuzzy: false },
  {
    to: '/dashboard/incidents',
    label: 'Incidents',
    icon: TriangleAlert,
    fuzzy: true,
  },
  /* After Incidents, per the Figma. MapIcon avoids shadowing JS's Map. */
  { to: '/dashboard/map', label: 'Map', icon: MapIcon, fuzzy: false },
  {
    to: '/dashboard/emergency-broadcasts',
    label: 'Emergency Broadcasts',
    icon: Radio,
    fuzzy: false,
  },
  {
    to: '/dashboard/health',
    label: 'System status',
    icon: Activity,
    fuzzy: false,
  },
] as const;

export function DashboardLayout() {
  const matchRoute = useMatchRoute();
  const { session } = route.useRouteContext();
  useRealtimeConnection();

  return (
    <TooltipProvider>
      <SidebarProvider>
        <Sidebar variant="inset" collapsible="icon">
          <SidebarHeader>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton size="lg" render={<Link to="/dashboard" />}>
                  <Wordmark
                    className="text-2xl"
                    textClassName="group-data-[collapsible=icon]:hidden"
                    logoClassName="group-data-[collapsible=icon]:ml-0 group-data-[collapsible=icon]:size-8!"
                  />
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarHeader>
          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupContent>
                <SidebarMenu>
                  {navItems.map((item) => (
                    <SidebarMenuItem key={item.to}>
                      <SidebarMenuButton
                        render={<Link to={item.to} />}
                        isActive={
                          !!matchRoute({ to: item.to, fuzzy: item.fuzzy })
                        }
                        tooltip={item.label}
                      >
                        <item.icon />
                        <span>{item.label}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>
          <SidebarFooter>
            <NavUser
              user={{
                name: session.user.name,
                email: session.user.email,
                avatar: session.user.image ?? undefined,
              }}
            />
          </SidebarFooter>
        </Sidebar>
        <SidebarInset>
          <header className="flex h-14 items-center gap-2 border-b px-4">
            <SidebarTrigger />
            <div className="ml-auto">
              <ThemeToggle />
            </div>
          </header>
          <main className="flex-1 p-4">
            <Outlet />
          </main>
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  );
}
