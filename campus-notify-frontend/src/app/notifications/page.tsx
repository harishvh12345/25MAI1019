'use client';
// src/app/notifications/page.tsx

import { useState, useEffect, useCallback } from 'react';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Pagination from '@mui/material/Pagination';
import Skeleton from '@mui/material/Skeleton';
import Card from '@mui/material/Card';
import Badge from '@mui/material/Badge';
import NotificationsIcon from '@mui/icons-material/Notifications';
import RefreshIcon from '@mui/icons-material/Refresh';
import DoneAllIcon from '@mui/icons-material/DoneAll';

import { Notification, NotificationType } from '@/lib/types';
import { fetchNotifications } from '@/lib/api';
import { useViewedNotifications } from '@/hooks/useViewedNotifications';
import NotificationCard from '@/components/NotificationCard';

const NOTIFICATION_TYPES = ['All', 'Placement', 'Result', 'Event'] as const;
const PAGE_SIZE = 10;

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [filtered, setFiltered] = useState<Notification[]>([]);
  const [typeFilter, setTypeFilter] = useState<string>('All');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { isViewed, markViewed, markAllViewed } = useViewedNotifications();

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchNotifications({ limit: 100 });
      setNotifications(result.notifications);
    } catch (e) {
      setError('Failed to load notifications. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const f = typeFilter === 'All'
      ? notifications
      : notifications.filter(n => n.Type === typeFilter);
    setFiltered(f);
    setPage(1);
  }, [typeFilter, notifications]);

  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const unviewedCount = notifications.filter(n => !isViewed(n.ID)).length;

  const handleMarkAllRead = () => {
    markAllViewed(notifications.map(n => n.ID));
  };

  return (
    <Container maxWidth="md" sx={{ py: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Badge badgeContent={unviewedCount} color="error" max={99}>
              <NotificationsIcon sx={{ fontSize: 28, color: 'primary.main' }} />
            </Badge>
            <Box>
              <Typography variant="h5" fontWeight={800} color="text.primary">
                All Notifications
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {filtered.length} total · {unviewedCount} unread
              </Typography>
            </Box>
          </Box>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              size="small"
              startIcon={<DoneAllIcon />}
              onClick={handleMarkAllRead}
              variant="outlined"
              disabled={unviewedCount === 0}
            >
              Mark all read
            </Button>
            <Button
              size="small"
              startIcon={<RefreshIcon />}
              onClick={load}
              variant="outlined"
              disabled={loading}
            >
              Refresh
            </Button>
          </Box>
        </Box>
      </Box>

      {/* Filters */}
      <Box sx={{ mb: 2.5 }}>
        <ToggleButtonGroup
          value={typeFilter}
          exclusive
          onChange={(_, val) => val && setTypeFilter(val)}
          size="small"
          sx={{ flexWrap: 'wrap', gap: 0.5 }}
        >
          {NOTIFICATION_TYPES.map(type => {
            const count = type === 'All'
              ? notifications.length
              : notifications.filter(n => n.Type === type).length;
            return (
              <ToggleButton
                key={type}
                value={type}
                sx={{
                  borderRadius: '8px !important',
                  border: '1px solid !important',
                  borderColor: 'divider !important',
                  px: 2,
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  '&.Mui-selected': {
                    backgroundColor: 'primary.main',
                    color: 'white',
                    '&:hover': { backgroundColor: 'primary.dark' },
                  },
                }}
              >
                {type} ({count})
              </ToggleButton>
            );
          })}
        </ToggleButtonGroup>
      </Box>

      {/* Error */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} action={
          <Button color="inherit" size="small" onClick={load}>Retry</Button>
        }>
          {error}
        </Alert>
      )}

      {/* Loading Skeletons */}
      {loading && (
        <Box>
          {Array.from({ length: 5 }).map((_, i) => (
            <Card key={i} sx={{ mb: 1.5, p: 2, borderLeft: '4px solid #e0e0e0' }}>
              <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                <Skeleton variant="circular" width={32} height={32} />
                <Box sx={{ flex: 1 }}>
                  <Skeleton variant="text" width="30%" height={20} />
                  <Skeleton variant="text" width="70%" height={16} />
                  <Skeleton variant="text" width="40%" height={14} />
                </Box>
              </Box>
            </Card>
          ))}
        </Box>
      )}

      {/* Notification List */}
      {!loading && !error && (
        <>
          {paginated.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 8 }}>
              <NotificationsIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 2 }} />
              <Typography color="text.secondary">No notifications found</Typography>
            </Box>
          ) : (
            <Box>
              {paginated.map(n => (
                <NotificationCard
                  key={n.ID}
                  notification={n}
                  isNew={!isViewed(n.ID)}
                  onClick={() => markViewed(n.ID)}
                />
              ))}
            </Box>
          )}

          {totalPages > 1 && (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
              <Pagination
                count={totalPages}
                page={page}
                onChange={(_, val) => { setPage(val); window.scrollTo(0, 0); }}
                color="primary"
                shape="rounded"
              />
            </Box>
          )}
        </>
      )}
    </Container>
  );
}
