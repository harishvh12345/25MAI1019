'use client';
// src/components/Navbar.tsx

import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Box from '@mui/material/Box';
import NotificationsIcon from '@mui/icons-material/Notifications';
import StarIcon from '@mui/icons-material/Star';
import SchoolIcon from '@mui/icons-material/School';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Navbar() {
  const pathname = usePathname();

  const navLinks = [
    { href: '/notifications', label: 'All Notifications', icon: <NotificationsIcon sx={{ fontSize: 18 }} /> },
    { href: '/priority', label: 'Priority Inbox', icon: <StarIcon sx={{ fontSize: 18 }} /> },
  ];

  return (
    <AppBar
      position="fixed"
      elevation={0}
      sx={{
        backgroundColor: 'white',
        borderBottom: '1px solid',
        borderColor: 'divider',
        color: 'text.primary',
      }}
    >
      <Toolbar sx={{ gap: 2, px: { xs: 2, sm: 3 } }}>
        {/* Brand */}
        <Box
          component={Link}
          href="/"
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            textDecoration: 'none',
            color: 'primary.main',
            flexGrow: { xs: 1, md: 0 },
          }}
        >
          <SchoolIcon sx={{ fontSize: 28 }} />
          <Typography
            variant="h6"
            sx={{
              fontWeight: 800,
              fontSize: { xs: '1rem', sm: '1.2rem' },
              letterSpacing: '-0.5px',
              display: { xs: 'none', sm: 'block' },
            }}
          >
            CampusNotify
          </Typography>
        </Box>

        {/* Spacer */}
        <Box sx={{ flexGrow: 1, display: { xs: 'none', md: 'block' } }} />

        {/* Nav Links */}
        <Box sx={{ display: 'flex', gap: 1 }}>
          {navLinks.map(link => (
            <Button
              key={link.href}
              component={Link}
              href={link.href}
              startIcon={link.icon}
              variant={pathname === link.href ? 'contained' : 'text'}
              color="primary"
              size="small"
              sx={{
                fontSize: { xs: '0.75rem', sm: '0.875rem' },
                px: { xs: 1.5, sm: 2 },
              }}
            >
              <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>
                {link.label}
              </Box>
              <Box component="span" sx={{ display: { xs: 'inline', sm: 'none' } }}>
                {link.label.split(' ')[0]}
              </Box>
            </Button>
          ))}
        </Box>
      </Toolbar>
    </AppBar>
  );
}
