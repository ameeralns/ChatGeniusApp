'use client';

import { Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { X, Mail, Calendar } from 'lucide-react';
import { User } from 'firebase/auth';

interface ProfileSlideOverProps {
  user: User;
  isOpen: boolean;
  onClose: () => void;
}

export default function ProfileSlideOver({ user, isOpen, onClose }: ProfileSlideOverProps) {
  return (
    <Transition.Root show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-in-out duration-500"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in-out duration-500"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/30 transition-opacity" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-hidden">
          <div className="absolute inset-0 overflow-hidden">
            <div className="pointer-events-none fixed inset-y-0 right-0 flex max-w-full pl-10">
              <Transition.Child
                as={Fragment}
                enter="transform transition ease-in-out duration-500"
                enterFrom="translate-x-full"
                enterTo="translate-x-0"
                leave="transform transition ease-in-out duration-500"
                leaveFrom="translate-x-0"
                leaveTo="translate-x-full"
              >
                <Dialog.Panel className="pointer-events-auto w-screen max-w-md">
                  <div className="flex h-full flex-col overflow-y-scroll bg-gray-800 shadow-xl">
                    <div className="px-4 py-6 sm:px-6">
                      <div className="flex items-start justify-between">
                        <h2 className="text-xl font-semibold text-white">Profile</h2>
                        <button
                          type="button"
                          className="relative rounded-md text-gray-400 hover:text-gray-300"
                          onClick={onClose}
                        >
                          <X className="h-6 w-6" aria-hidden="true" />
                        </button>
                      </div>
                    </div>
                    <div className="relative flex-1 px-4 sm:px-6">
                      {/* Profile Content */}
                      <div className="space-y-6">
                        {/* Avatar and Name */}
                        <div className="flex flex-col items-center">
                          <div className="h-24 w-24 rounded-full bg-purple-600 flex items-center justify-center text-white text-3xl font-medium">
                            {user.displayName?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase()}
                          </div>
                          <h3 className="mt-4 text-xl font-medium text-white">
                            {user.displayName || 'No display name'}
                          </h3>
                          <div className="flex items-center mt-1 text-gray-400">
                            <div className="flex items-center">
                              <Mail className="h-4 w-4 mr-2" />
                              {user.email}
                            </div>
                          </div>
                        </div>

                        {/* Account Details */}
                        <div className="bg-gray-700/50 rounded-lg p-4">
                          <h4 className="text-sm font-medium text-gray-300 mb-4">Account Details</h4>
                          <div className="space-y-3">
                            <div>
                              <label className="block text-sm font-medium text-gray-400">
                                Email verified
                              </label>
                              <span className="text-sm text-white">
                                {user.emailVerified ? 'Yes' : 'No'}
                              </span>
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-400">
                                Account created
                              </label>
                              <span className="text-sm text-white">
                                {user.metadata.creationTime ? (
                                  <div className="flex items-center">
                                    <Calendar className="h-4 w-4 mr-2" />
                                    {new Date(user.metadata.creationTime).toLocaleDateString()}
                                  </div>
                                ) : (
                                  'Not available'
                                )}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </div>
      </Dialog>
    </Transition.Root>
  );
} 