#!/usr/bin/perl
# macOS ships Perl. Give each command its own process group; bound TERM and KILL.
use strict;
use warnings;
use POSIX qw(setsid WNOHANG);
use Time::HiRes qw(time sleep);
my ($seconds, $grace, @command) = @ARGV;
die "usage: bounded.pl seconds grace command...\n" unless $seconds > 0 && $grace > 0 && @command;
my $pid = fork();
die "fork: $!" unless defined $pid;
if (!$pid) {
    setsid() >= 0 or die "setsid: $!";
    exec @command;
    die "exec: $!";
}
my $signal = 0;
$SIG{TERM} = sub { $signal = 15 };
$SIG{INT} = sub { $signal = 2 };
my $deadline = time() + $seconds;
my ($sent, $kill_at);
while (1) {
    my $done = waitpid($pid, WNOHANG);
    if ($done == $pid) {
        my $result = $?;
        # Reap remaining descendants even if their direct parent exited on TERM.
        kill 'KILL', -$pid;
        exit($sent ? ($signal ? 128 + $signal : 124) : ($result & 127 ? 128 + ($result & 127) : $result >> 8));
    }
    if (!$sent && ($signal || time() >= $deadline)) {
        kill 'TERM', -$pid;
        $sent = 1;
        $kill_at = time() + $grace;
    }
    if ($sent && time() >= $kill_at) { kill 'KILL', -$pid; }
    sleep 0.05;
}
