#!/usr/bin/env python3

import gi
gi.require_version('Gtk', '3.0')
from gi.repository import Gtk

import subprocess

def open_file(*_):
    dialog = Gtk.FileChooserNative(title='Select a file',
                                   transient_for=win,
                                   action=Gtk.FileChooserAction.OPEN)

    response = dialog.run()
    script = dialog.get_filename()
    dialog.destroy()

    # freenode: #flatpak

    if response == Gtk.ResponseType.ACCEPT:
        print(script)
        result = subprocess.run(['flatpak-spawn', '--host', 'bash', '--', script])
        status.set_label(f'Return code: {result.returncode}')

win = Gtk.Window()
win.set_default_size(250, 150)
win.connect('destroy', Gtk.main_quit)
status = Gtk.Label(label='Ready!')
button = Gtk.Button(label='Open file')
button.connect('clicked', open_file)
box = Gtk.Box(orientation=Gtk.Orientation.VERTICAL)
box.set_spacing(10)
box.add(status)
box.add(button)
win.add(box)
win.show_all()
Gtk.main()
