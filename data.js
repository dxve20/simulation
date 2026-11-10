/* ServerLab data: lesson steps, quiz, badges, levels. No DOM here so it can be tested in Node. */
const SL = {};
 
SL.PASS = 60; // assessment pass mark in percent
 
SL.LANGS = ['English (United States)', 'English (United Kingdom)', 'Chinese (Traditional)', 'Japanese', 'Spanish (Spain)'];
SL.TIMES = ['English (United States)', 'English (Philippines)', 'English (United Kingdom)', 'Chinese (Traditional, Taiwan)'];
SL.KBS = ['US', 'United Kingdom', 'Chinese (Traditional) - US Keyboard', 'Japanese'];
 
SL.EDITIONS = [
  { name: 'Windows Server 2019 Standard', desc: 'This option installs Server Core. There is no desktop; you manage the server with a command prompt or remotely.' },
  { name: 'Windows Server 2019 Standard (Desktop Experience)', desc: 'This option installs the full graphical interface, including Server Manager. Use it for a server you will manage with the mouse.' },
  { name: 'Windows Server 2019 Datacenter', desc: 'This option installs Server Core with Datacenter licensing, built for heavily virtualised servers. There is no desktop.' },
  { name: 'Windows Server 2019 Datacenter (Desktop Experience)', desc: 'This option installs the full graphical interface with Datacenter licensing, built for heavily virtualised servers.' },
];
 
/* One entry per step. goal = what to do, hint = how, ok = why the right click is right. */
SL.STEPS = [
  { id: 'boot', title: 'Boot from the installation media', short: 'Boot from the CD/DVD with the Windows Server 2019 ISO',
    goal: 'Start the installer. Boot the VM from the Windows Server 2019 media.',
    hint: 'Pick the CD/DVD drive. It is the one that mentions Windows Server 2019.',
    ok: 'The installer lives on the CD/DVD (the ISO), so that is the device to boot from.' },
  { id: 'language', title: 'Language, time and keyboard', short: 'Keep English (United States) and the US keyboard, then Next',
    goal: 'Check the three language settings match the lab, then click Next.',
    hint: 'Language and Time are English (United States). Keyboard is US. Then press Next.',
    ok: 'These defaults match the lab manual, and a US keyboard keeps symbols in the right place for passwords.' },
  { id: 'install', title: 'Install now', short: 'Click Install now',
    goal: 'Start a new installation.',
    hint: 'Click the big Install now button in the middle of the window.',
    ok: 'Install now starts a fresh installation. Repair is only for a Windows that already exists.' },
  { id: 'edition', title: 'Choose the edition', short: 'Pick Standard (Desktop Experience) for the full GUI',
    goal: 'Choose the edition that gives you the full graphical interface.',
    hint: 'Select "Windows Server 2019 Standard (Desktop Experience)" and press Next.',
    ok: 'Desktop Experience gives you the GUI and Server Manager. Without it you get Server Core.' },
  { id: 'license', title: 'Accept the license terms', short: 'Tick "I accept the license terms", then Next',
    goal: 'Accept the license terms so Setup lets you continue.',
    hint: 'Tick the check box at the bottom. Next only works after that.',
    ok: 'Setup cannot continue until the license terms are accepted.' },
  { id: 'type', title: 'Choose the installation type', short: 'Choose Custom: Install Windows only (advanced)',
    goal: 'Pick the installation type for a blank disk.',
    hint: 'Choose "Custom: Install Windows only (advanced)".',
    ok: 'Custom is the right type for a blank disk. Upgrade needs an older Windows to upgrade.' },
  { id: 'disk1', title: 'Select the free space and click New', short: 'Select Unallocated Space, click New',
    goal: 'Prepare the disk. Select the unallocated space and click New.',
    hint: 'Click the row "Drive 0 Unallocated Space", then click New under the list.',
    ok: 'New creates a partition from the unallocated space.' },
  { id: 'disk2', title: 'Set the size and Apply', short: 'Use the full 60 GB, click Apply, then OK',
    goal: 'Keep the full size (61440 MB) and click Apply. Confirm the extra partitions message.',
    hint: 'Leave the size as it is, click Apply, then click OK on the message.',
    ok: 'Using the whole disk leaves room for updates. Setup also adds a small System Reserved partition for boot files.' },
  { id: 'disk3', title: 'Pick the partition and Next', short: 'Select Partition 2 (Primary), click Next',
    goal: 'Choose where Windows goes. Select the big Primary partition and click Next.',
    hint: 'Select "Drive 0 Partition 2" (the large one), then click Next.',
    ok: 'Windows goes on the large Primary partition. System Reserved only holds boot files.' },
  { id: 'install2', title: 'Installing Windows (fast-forward)', short: 'Fast-forward through the file copy and restarts',
    goal: 'Setup copies files and restarts the server. Skip the wait with Fast-forward.',
    hint: 'Click the glowing Fast-forward button above the screen.',
    ok: 'In real life this takes a while and the server restarts on its own. The simulator skips it.' },
  { id: 'password', title: 'Set the Administrator password', short: 'Type a strong password twice, click Finish',
    goal: 'Create the Administrator password: 8+ characters, 3 of 4 character types. Type it twice.',
    hint: 'Try something like Server2019 in both boxes, then click Finish.',
    ok: 'A complex password protects the built-in Administrator account.' },
  { id: 'signin', title: 'Ctrl+Alt+Delete and sign in', short: 'Send Ctrl+Alt+Del, sign in as Administrator',
    goal: 'Unlock the sign-in screen with Ctrl+Alt+Delete, then sign in as Administrator.',
    hint: 'Click Ctrl+Alt+Del above the screen, then type the password you set in the last step.',
    ok: 'Windows Server asks for Ctrl+Alt+Delete before sign-in, then checks your password.' },
  { id: 'sm', title: 'Find the computer name in Server Manager', short: 'Server Manager > Local Server > Computer name',
    goal: 'Server Manager opens by itself. Open Local Server and find the Computer name.',
    hint: 'Click Local Server in the left list, then click the Computer name row.',
    ok: 'Local Server shows the computer name, workgroup and other basic settings of this server.' },
];
 
/* Quiz: a[0] is always the correct answer; options are shuffled per attempt. */
SL.QUIZ = [
  { q: 'Which boot device starts the Windows Server 2019 installer from an ISO?', a: ['CD/DVD drive with the Windows Server 2019 media', 'The empty hard disk', 'Network (PXE) boot with no server', 'The USB keyboard'], why: 'The installer is on the media. An empty disk has nothing to boot, and PXE needs a deployment server.' },
  { q: 'Which edition gives you the full graphical interface?', a: ['Windows Server 2019 Standard (Desktop Experience)', 'Windows Server 2019 Standard', 'Windows Server 2019 Datacenter', 'Repair your computer'], why: 'Only the editions labelled Desktop Experience include the GUI. The others install Server Core.' },
  { q: 'You are installing onto an empty disk. Which install type do you choose?', a: ['Custom: Install Windows only (advanced)', 'Upgrade: Install Windows and keep files, settings, and applications', 'Repair your computer', 'Load a storage driver and restart'], why: 'On an empty disk there is nothing to keep, so Custom is the one that works.' },
  { q: 'What must you do before Next works on the license terms screen?', a: ['Tick "I accept the license terms"', 'Restart the virtual machine', 'Type the product key twice', 'Delete the System Reserved partition'], why: 'Next stays disabled until the license terms are accepted.' },
  { q: 'About how much disk space does the lab say a Windows Server 2019 partition needs at minimum?', a: ['32 GB', '8 GB', '10 GB', '16 GB'], why: 'The system requirement used in this lab is 32 GB. This is why we use the whole 60 GB disk.' },
  { q: 'On the partition screen, where do you install Windows?', a: ['On the large Primary partition (Partition 2)', 'On the small System Reserved partition', 'On both partitions at once', 'Nowhere: delete everything and click Next'], why: 'System Reserved is a small partition for boot files. The Primary partition is where Windows goes.' },
  { q: 'Which password follows the lab rule (8+ characters, 3 of 4 character types)?', a: ['Server2019', 'p@ssword', 'ABCDEFGH', 'Ab1'], why: 'Server2019 has uppercase, lowercase and numbers. "p@ssword" has only two types, "ABCDEFGH" one, and "Ab1" is too short.' },
  { q: 'How do you unlock the Windows Server sign-in screen?', a: ['Press Ctrl+Alt+Delete', 'Press Windows+L', 'Press Alt+F4', 'Press Ctrl+Shift+Esc'], why: 'Windows Server asks for Ctrl+Alt+Delete first. In a VM you send it from the toolbar.' },
  { q: 'Which Server Manager page shows the computer name and workgroup?', a: ['Local Server', 'Dashboard', 'All Servers', 'File and Storage Services'], why: 'Local Server lists the properties of the machine you are on, including the computer name.' },
  { q: 'Which account do you set the password for on the Customize settings page?', a: ['Administrator', 'Guest', 'DefaultAccount', 'SYSTEM'], why: 'Setup asks for the built-in Administrator password, which you then use to sign in.' },
];
 
SL.BADGES = [
  { id: 'first_boot', code: '01', title: 'First boot', desc: 'Start the installer for the first time.' },
  { id: 'right_edition', code: '02', title: 'Right edition', desc: 'Pick Desktop Experience on the first try.' },
  { id: 'clean_disk', code: '03', title: 'Clean disk', desc: 'Do all three disk steps with no mistakes and no hints.' },
  { id: 'no_hints', code: '04', title: 'No hints', desc: 'Finish the lesson without using a hint.' },
  { id: 'club60', code: '05', title: '60% club', desc: 'Pass the assessment.' },
  { id: 'full_marks', code: '06', title: 'Full marks', desc: 'Score 100% on the assessment.' },
];
 
SL.LEVELS = [
  { n: 1, name: 'Trainee', at: 0 },
  { n: 2, name: 'Operator', at: 60 },
  { n: 3, name: 'Rack tech', at: 140 },
  { n: 4, name: 'Sysadmin', at: 240 },
  { n: 5, name: 'Architect', at: 330 },
];
 
/* Sample classmates so the board is not empty. Marked as samples in the UI. */
SL.SAMPLES = [
  { name: 'Jon Reyes', points: 340 }, { name: 'Aira Cruz', points: 285 }, { name: 'Paolo Diaz', points: 190 },
  { name: 'Lea Mendoza', points: 150 }, { name: 'Kyle Tan', points: 110 }, { name: 'Rica Gomez', points: 80 }, { name: 'Dan Ortiz', points: 45 },
];
 