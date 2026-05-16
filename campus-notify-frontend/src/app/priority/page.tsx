'use client';
// src/app/priority/page.tsx

import { useState, useEffect, useCallback } from 'react';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import Slider from '@mui/material/Slider';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Skeleton from '@mui/material/Skeleton';
import Divider from '@mui/material/Divider';
import Tooltip from '@mui/material/Tooltip';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import StarIcon from '@mui/icons-material/Star';
import RefreshIcon from '@mui/icons-material/Refresh';
import TuneIcon from '@mui/icons-material/Tune';

import { Notification, getTopN, getPriorityScore, TYPE_COLORS, TYPE_BG_COLORS, TYPE_ICONS } from '@/lib/types';
import { fetchNotifications } from '@/lib/api';
import { useViewedNotifications } from '@/hooks/useViewedNotifications';
import NotificationCard from '@/components/NotificationCard';

const NOTIFICATION_TYPES = ['All', 'Placement', 'Result', 'Event'] as const;

export default function PriorityPage() {
  const [allNotifications, setAllNotifications] = useState<Notification[]>([]);
  const [typeFilter, setTypeFilter] = useState<string>('All');
  const [topN, setTopN] = useState<number>(10);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { isViewed, markViewed } = useViewedNotifications();

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchNotifications({ limit: 100 });
      setAllNotifications(result.notifications);
    } catch {
      setError('Failed to load notifications. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = typeFilter === 'All'
    ? allNotifications
    : allNotifications.filter(n => n.Type === typeFilter);

  const topNotifications = getTopN(filtered, topN);

  // Stats
  const typeCounts = ['Placement', 'Result', 'Event'].map(type => ({
    type,
    count: topNotifications.filter(n => n.Type === type).length,
  }));

  return (
    <Container maxWidth="md" sx={{ py: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.5 }}>
          <StarIcon sx={{ fontSize: 28, color: 'warning.main' }} />
          <Typography variant="h5" fontWeight={800} color="text.primary">
            Priority Inbox
          </Typography>
          <Tooltip title="Notifications are ranked by type importance (Placement > Result > Event) and recency. Scores combine both factors." arrow>
            <InfoOutlinedIcon sx={{ fontSize: 18, color: 'text.disabled', cursor: 'help' }} />
          </Tooltip>
        </Box>
        <Typography variant="caption" color="text.secondary">
          Smart ranking · Placement &gt; Result &gt; Event · Weighted by recency
        </Typography>
      </Box>

      {/* Controls */}
      <Card sx={{ mb: 3, border: '1px solid', borderColor: 'divider' }}>
        <CardContent sx={{ pb: '16px !important' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <TuneIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
            <Typography variant="subtitle2" fontWeight={700} color="text.secondary">
              FILTER & CONTROLS
            </Typography>
          </Box>

          {/* Top-N Slider */}
          <Box sx={{ mb: 2.5 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
              <Typography variant="body2" fontWeight={600}>
                Show top notifications
              </Typography>
              <Box
                sx={{
                  px: 1.5,
                  py: 0.25,
                  borderRadius: 2,
                  backgroundColor: 'primary.main',
                  color: 'white',
                  fontWeight: 800,
                  fontSize: '0.9rem',
                }}
              >
                {topN}
              </Box>
            </Box>
            <Slider
              value={topN}
              min={5}
              max={20}
              step={1}
              marks={[
                { value: 5, label: '5' },
                { value: 10, label: '10' },
                { value: 15, label: '15' },
                { value: 20, label: '20' },
              ]}
              onChange={(_, val) => setTopN(val as number)}
              color="primary"
              sx={{ color: 'primary.main' }}
            />
          </Box>

          <Divider sx={{ mb: 2 }} />

          {/* Type Filter */}
          <Box>
            <Typography variant="body2" fontWeight={600} sx={{ mb: 1 }}>
              Filter by type
            </Typography>
            <ToggleButtonGroup
              value={typeFilter}
              exclusive
              onChange={(_, val) => val && setTypeFilter(val)}
              size="small"
              sx={{ flexWrap: 'wrap', gap: 0.5 }}
            >
              {NOTIFICATION_TYPES.map(type => (
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
                  {type !== 'All' && (
                    <span style={{ marginRight: 4 }}>{TYPE_ICONS[type as keyof typeof TYPE_ICONS]}</span>
                  )}
                  {type}
                </ToggleButton>
              ))}
            </ToggleButtonGroup>
          </Box>
        </CardContent>
      </Card>

      {/* Error */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} action={
          <Button color="inherit" size="small" onClick={load}>Retry</Button>
        }>
          {error}
        </Alert>
      )}

      {/* Refresh */}
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
        <Button size="small" startIcon={<RefreshIcon />} onClick={load} variant="outlined" disabled={loading}>
          Refresh
        </Button>
      </Box>

      {/* Type breakdown */}
      {!loading && topNotifications.length > 0 && (
        <Box sx={{ display: 'flex', gap: 1, mb: 2.5, flexWrap: 'wrap' }}>
          {typeCounts.filter(t => t.count > 0).map(({ type, count }) => (
            <Box
              key={type}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 0.5,
                px: 1.5,
                py: 0.5,
                borderRadius: 2,
                backgroundColor: TYPE_BG_COLORS[type as keyof typeof TYPE_BG_COLORS],
                color: TYPE_COLORS[type as keyof typeof TYPE_COLORS],
                fontSize: '0.78rem',
                fontWeight: 700,
              }}
            >
              <span>{TYPE_ICONS[type as keyof typeof TYPE_ICONS]}</span>
              {count} {type}
            </Box>
          ))}
        </Box>
      )}

      {/* Loading */}
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

      {/* Priority List */}
      {!loading && !error && (
        <>
          {topNotifications.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 8 }}>
              <StarIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 2 }} />
              <Typography color="text.secondary">No notifications to display</Typography>
            </Box>
          ) : (
            <Box>
              <Typography variant="caption" color="text.secondary" sx={{ mb: 1.5, display: 'block' }}>
                Showing top {topNotifications.length} of {filtered.length} notifications
              </Typography>
              {topNotifications.map((n, i) => (
                <NotificationCard
                  key={n.ID}
                  notification={n}
                  isNew={!isViewed(n.ID)}
                  rank={i + 1}
                  score={getPriorityScore(n)}
                  onClick={() => markViewed(n.ID)}
                />
              ))}
            </Box>
          )}
        </>
      )}
    </Container>
  );
}
