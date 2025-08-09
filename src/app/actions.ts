"use server";

import { encodedRedirect } from "@/utils/utils";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "../../supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";

export const signUpAction = async (formData: FormData) => {
  const email = formData.get("email")?.toString();
  const password = formData.get("password")?.toString();
  const fullName = formData.get("full_name")?.toString() || "";

  // Import the action client that can modify cookies
  const { createActionClient } = await import("../../supabase/server");
  const supabase = await createActionClient();
  const origin = headers().get("origin");

  if (!email || !password) {
    return encodedRedirect(
      "error",
      "/sign-up",
      "Email and password are required",
    );
  }

  const {
    data: { user },
    error,
  } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${origin}/auth/callback`,
      data: {
        full_name: fullName,
        email: email,
      },
    },
  });

  console.log("After signUp", error);

  if (error) {
    console.error(error.code + " " + error.message);
    return encodedRedirect("error", "/sign-up", error.message);
  }

  if (user) {
    try {
      // Use service role client to bypass RLS for user creation
      const serviceSupabase = createServiceClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_KEY!,
      );

      const { error: updateError } = await serviceSupabase
        .from("users")
        .insert({
          id: user.id,
          name: fullName,
          full_name: fullName,
          email: email,
          user_id: user.id,
          token_identifier: user.id,
          created_at: new Date().toISOString(),
        });

      if (updateError) {
        console.error("Error updating user profile:", updateError);
      }
    } catch (err) {
      console.error("Error in user profile creation:", err);
    }
  }

  return encodedRedirect(
    "success",
    "/sign-up",
    "Thanks for signing up! Please check your email for a verification link.",
  );
};

export const signInAction = async (formData: FormData) => {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  // Import the action client that can modify cookies
  const { createActionClient } = await import("../../supabase/server");
  const supabase = await createActionClient();

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return encodedRedirect("error", "/sign-in", error.message);
  }

  return redirect("/dashboard");
};

export const forgotPasswordAction = async (formData: FormData) => {
  const email = formData.get("email")?.toString();

  // Import the action client that can modify cookies
  const { createActionClient } = await import("../../supabase/server");
  const supabase = await createActionClient();
  const origin = headers().get("origin");
  const callbackUrl = formData.get("callbackUrl")?.toString();

  if (!email) {
    return encodedRedirect("error", "/forgot-password", "Email is required");
  }

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/auth/callback?redirect_to=/protected/reset-password`,
  });

  if (error) {
    console.error(error.message);
    return encodedRedirect(
      "error",
      "/forgot-password",
      "Could not reset password",
    );
  }

  if (callbackUrl) {
    return redirect(callbackUrl);
  }

  return encodedRedirect(
    "success",
    "/forgot-password",
    "Check your email for a link to reset your password.",
  );
};

export const resetPasswordAction = async (formData: FormData) => {
  // Import the action client that can modify cookies
  const { createActionClient } = await import("../../supabase/server");
  const supabase = await createActionClient();

  const password = formData.get("password") as string;
  const confirmPassword = formData.get("confirmPassword") as string;

  if (!password || !confirmPassword) {
    encodedRedirect(
      "error",
      "/protected/reset-password",
      "Password and confirm password are required",
    );
  }

  if (password !== confirmPassword) {
    encodedRedirect(
      "error",
      "/dashboard/reset-password",
      "Passwords do not match",
    );
  }

  const { error } = await supabase.auth.updateUser({
    password: password,
  });

  if (error) {
    encodedRedirect(
      "error",
      "/dashboard/reset-password",
      "Password update failed",
    );
  }

  encodedRedirect("success", "/protected/reset-password", "Password updated");
};

export const signOutAction = async () => {
  // Import the action client that can modify cookies
  const { createActionClient } = await import("../../supabase/server");
  const supabase = await createActionClient();
  await supabase.auth.signOut();
  return redirect("/sign-in");
};

// Fund Management Actions
export const createFundSourceAction = async (formData: FormData) => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return encodedRedirect(
      "error",
      "/dashboard",
      "You must be logged in to create funds",
    );
  }

  const name = formData.get("name")?.toString();
  const amount = parseFloat(formData.get("amount")?.toString() || "0");
  const currency = formData.get("currency")?.toString() || "USD";
  const is_restricted = formData.get("is_restricted") === "true";
  const donor_id = formData.get("donor_id")?.toString();
  const project_id = formData.get("project_id")?.toString();
  const restrictions = formData.get("restrictions")?.toString();
  const received_date = formData.get("received_date")?.toString();

  if (!name || !amount) {
    return encodedRedirect(
      "error",
      "/dashboard",
      "Fund name and amount are required",
    );
  }

  const { error } = await supabase.from("fund_sources").insert({
    name,
    amount,
    currency,
    is_restricted,
    donor_id: donor_id || null,
    project_id: project_id || null,
    restrictions: restrictions || null,
    received_date: received_date || new Date().toISOString().split("T")[0],
    status: "received",
  });

  if (error) {
    console.error("Error creating fund source:", error);
    return encodedRedirect(
      "error",
      "/dashboard",
      "Failed to create fund source",
    );
  }

  return encodedRedirect(
    "success",
    "/dashboard",
    "Fund source created successfully",
  );
};

export const createExpenseAction = async (formData: FormData) => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      success: false,
      error: "You must be logged in to create expenses",
    };
  }

  const title = formData.get("title")?.toString();
  const description = formData.get("description")?.toString();
  const amount = parseFloat(formData.get("amount")?.toString() || "0");
  const currency = formData.get("currency")?.toString() || "USD";
  const expense_date = formData.get("expense_date")?.toString();
  const category_id = formData.get("category_id")?.toString();
  const project_id = formData.get("project_id")?.toString();
  const vendor_name = formData.get("vendor_name")?.toString();
  const payment_method = formData.get("payment_method")?.toString();
  const notes = formData.get("notes")?.toString();

  if (!title || !amount || !expense_date) {
    return {
      success: false,
      error: "Title, amount, and expense date are required",
    };
  }

  const { error } = await supabase.from("expenses").insert({
    title,
    description: description || null,
    amount,
    currency,
    expense_date,
    category_id:
      category_id && category_id.trim() !== "" && category_id !== "no_category"
        ? category_id
        : null,
    project_id:
      project_id && project_id.trim() !== "" && project_id !== "no_project"
        ? project_id
        : null,
    vendor_name: vendor_name || null,
    payment_method: payment_method || null,
    notes: notes || null,
    status: "pending",
    submitted_by: user.id,
  });

  if (error) {
    console.error("Error creating expense:", error);
    return {
      success: false,
      error: "Failed to create expense",
    };
  }

  return {
    success: true,
    message: "Expense submitted successfully",
  };
};

export const updateExpenseStatusAction = async (formData: FormData) => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      success: false,
      error: "You must be logged in",
    };
  }

  const expense_id = formData.get("expense_id")?.toString();
  const status = formData.get("status")?.toString();

  if (!expense_id || !status) {
    return {
      success: false,
      error: "Expense ID and status are required",
    };
  }

  const { error } = await supabase
    .from("expenses")
    .update({
      status,
      approved_by: status === "approved" ? user.id : null,
    })
    .eq("id", expense_id);

  if (error) {
    console.error("Error updating expense status:", error);
    return {
      success: false,
      error: "Failed to update expense status",
    };
  }

  return {
    success: true,
    message: "Expense status updated successfully",
  };
};

export const createDonorAction = async (formData: FormData) => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return encodedRedirect(
      "error",
      "/dashboard",
      "You must be logged in to create donors",
    );
  }

  const name = formData.get("name")?.toString();
  const contact_email = formData.get("contact_email")?.toString();
  const contact_phone = formData.get("contact_phone")?.toString();
  const address = formData.get("address")?.toString();
  const type = formData.get("type")?.toString() || "individual";
  const notes = formData.get("notes")?.toString();

  if (!name) {
    return encodedRedirect("error", "/dashboard", "Donor name is required");
  }

  const { error } = await supabase.from("donors").insert({
    name,
    contact_email: contact_email || null,
    contact_phone: contact_phone || null,
    address: address || null,
    type,
    notes: notes || null,
  });

  if (error) {
    console.error("Error creating donor:", error);
    return encodedRedirect("error", "/dashboard", "Failed to create donor");
  }

  return encodedRedirect("success", "/dashboard", "Donor created successfully");
};

export const createBudgetAction = async (formData: FormData) => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return encodedRedirect(
      "error",
      "/dashboard",
      "You must be logged in to create budgets",
    );
  }

  const name = formData.get("name")?.toString();
  const planned_amount = parseFloat(
    formData.get("planned_amount")?.toString() || "0",
  );
  const currency = formData.get("currency")?.toString() || "USD";
  const category_id = formData.get("category_id")?.toString();
  const project_id = formData.get("project_id")?.toString();
  const period_start = formData.get("period_start")?.toString();
  const period_end = formData.get("period_end")?.toString();
  const notes = formData.get("notes")?.toString();

  if (!name || !planned_amount) {
    return encodedRedirect(
      "error",
      "/dashboard",
      "Budget name and planned amount are required",
    );
  }

  const { error } = await supabase.from("budgets").insert({
    name,
    planned_amount,
    currency,
    category_id: category_id || null,
    project_id: project_id || null,
    period_start: period_start || null,
    period_end: period_end || null,
    notes: notes || null,
  });

  if (error) {
    console.error("Error creating budget:", error);
    return encodedRedirect("error", "/dashboard", "Failed to create budget");
  }

  return encodedRedirect(
    "success",
    "/dashboard",
    "Budget created successfully",
  );
};

export const getUsersAction = async () => {
  try {
    console.log("Fetching users with service role client...");

    // Use service role client to bypass RLS for user fetching
    const serviceSupabase = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!,
    );

    // First try to get users from auth.users
    const { data: authData, error: authError } =
      await serviceSupabase.auth.admin.listUsers();

    if (authError) {
      console.error("Error fetching users from auth.users:", authError);

      // Fallback: try to fetch from custom users table
      const { data: customUsers, error: customError } = await serviceSupabase
        .from("users")
        .select("*")
        .order("created_at", { ascending: false });

      if (customError) {
        console.error(
          "Error fetching users from custom users table:",
          customError,
        );
        return {
          success: false,
          error: "Failed to fetch users",
          users: [],
        };
      }

      console.log("Loaded users from custom users table:", customUsers);
      return {
        success: true,
        users: customUsers || [],
      };
    }

    console.log("Users loaded from auth.users:", authData);

    // Transform auth users to match our User interface
    const transformedUsers = authData.users.map((user) => ({
      id: user.id,
      email: user.email || "",
      full_name:
        user.user_metadata?.full_name || user.user_metadata?.name || "",
      created_at: user.created_at,
    }));

    return {
      success: true,
      users: transformedUsers,
    };
  } catch (error) {
    console.error("Error in getUsersAction:", error);
    return {
      success: false,
      error: "Failed to fetch users",
      users: [],
    };
  }
};

export const getUserRolesAction = async () => {
  try {
    console.log("Fetching user roles with service role client...");

    // Use service role client to bypass RLS for user role fetching
    const serviceSupabase = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!,
    );

    // First, get all user roles without join to avoid foreign key relationship error
    const { data: userRoles, error: rolesError } = await serviceSupabase
      .from("user_roles")
      .select("*")
      .order("created_at", { ascending: false });

    if (rolesError) {
      console.error("Error loading user roles:", rolesError);
      return {
        success: false,
        error: "Failed to fetch user roles",
        userRoles: [],
      };
    }

    console.log("Loaded user roles:", userRoles);

    if (!userRoles || userRoles.length === 0) {
      return {
        success: true,
        userRoles: [],
      };
    }

    // Get all unique user IDs from roles
    const userIds = Array.from(
      new Set(userRoles.map((role) => role.user_id).filter(Boolean)),
    );

    // Fetch user data from both auth and custom users table
    const usersMap = new Map();

    // Try to get users from custom users table first
    try {
      const { data: customUsers } = await serviceSupabase
        .from("users")
        .select("id, email, full_name, name, created_at")
        .in("id", userIds);

      if (customUsers) {
        customUsers.forEach((user) => {
          usersMap.set(user.id, {
            id: user.id,
            email: user.email || "",
            full_name: user.full_name || user.name || "",
            created_at: user.created_at,
          });
        });
      }
    } catch (customError) {
      console.error("Error fetching from custom users table:", customError);
    }

    // For any missing users, try to fetch from auth
    const missingUserIds = userIds.filter((id) => !usersMap.has(id));

    if (missingUserIds.length > 0) {
      await Promise.all(
        missingUserIds.map(async (userId) => {
          try {
            const { data: authUser } =
              await serviceSupabase.auth.admin.getUserById(userId);
            if (authUser.user) {
              usersMap.set(userId, {
                id: authUser.user.id,
                email: authUser.user.email || "",
                full_name:
                  authUser.user.user_metadata?.full_name ||
                  authUser.user.user_metadata?.name ||
                  "",
                created_at: authUser.user.created_at,
              });
            }
          } catch (authError) {
            console.error(
              `Error fetching user ${userId} from auth:`,
              authError,
            );
          }
        }),
      );
    }

    // Combine roles with user data
    const rolesWithUsers = userRoles.map((role) => ({
      ...role,
      user: usersMap.get(role.user_id) || null,
    }));

    console.log("User roles with user data:", rolesWithUsers);
    return {
      success: true,
      userRoles: rolesWithUsers,
    };
  } catch (error) {
    console.error("Error in getUserRolesAction:", error);
    return {
      success: false,
      error: "Failed to fetch user roles",
      userRoles: [],
    };
  }
};

export const createUserAction = async (formData: FormData) => {
  const supabase = await createClient();
  const {
    data: { user: currentUser },
  } = await supabase.auth.getUser();

  if (!currentUser) {
    return {
      success: false,
      error: "You must be logged in to create users",
    };
  }

  const email = formData.get("email")?.toString();
  const password = formData.get("password")?.toString();
  const fullName = formData.get("full_name")?.toString();
  const role = formData.get("role")?.toString();

  if (!email || !password) {
    return {
      success: false,
      error: "Email and password are required",
    };
  }

  try {
    console.log("Creating new user with server action:", {
      email,
      full_name: fullName,
      role,
    });

    // Use service role client to bypass RLS for user creation
    const serviceSupabase = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!,
    );

    // First check if user already exists in the users table
    const { data: existingUser } = await serviceSupabase
      .from("users")
      .select("id, email")
      .eq("email", email)
      .single();

    if (existingUser) {
      console.log("User already exists:", existingUser);
      return {
        success: false,
        error: "A user with this email address already exists",
      };
    }

    // Create user with Supabase Auth using service role client
    const { data: authData, error: authError } =
      await serviceSupabase.auth.admin.createUser({
        email,
        password,
        user_metadata: {
          full_name: fullName || null,
        },
        email_confirm: true, // Auto-confirm email for admin-created users
      });

    if (authError) {
      console.error("Error creating auth user:", authError);
      // Handle specific error cases
      if (authError.message.includes("already registered")) {
        return {
          success: false,
          error: "A user with this email address already exists",
        };
      }
      return {
        success: false,
        error: "Failed to create user: " + authError.message,
      };
    }

    if (authData.user) {
      console.log("Auth user created:", authData.user.id);

      // Use upsert to handle potential duplicates gracefully
      const { data: userData, error: userError } = await serviceSupabase
        .from("users")
        .upsert(
          {
            id: authData.user.id,
            email: email,
            full_name: fullName || null,
            name: fullName || null,
            user_id: authData.user.id,
            token_identifier: authData.user.id,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          {
            onConflict: "id",
          },
        )
        .select();

      if (userError) {
        console.error("Error adding user to users table:", userError);
        // If user creation in database fails, clean up the auth user
        try {
          await serviceSupabase.auth.admin.deleteUser(authData.user.id);
        } catch (cleanupError) {
          console.error("Error cleaning up auth user:", cleanupError);
        }
        return {
          success: false,
          error: "Failed to add user to database: " + userError.message,
        };
      }

      console.log("User added to users table:", userData);

      // Assign role if specified using service role
      if (role) {
        console.log("Assigning role to user:", {
          userId: authData.user.id,
          role,
        });

        // Use simple insert for role assignment since this is a new user
        const { data: roleData, error: roleError } = await serviceSupabase
          .from("user_roles")
          .insert({
            user_id: authData.user.id,
            role: role,
            created_at: new Date().toISOString(),
          })
          .select();

        if (roleError) {
          console.error("Error assigning role:", roleError);
          console.error("Role error details:", roleError);

          // If role assignment fails, we should still return success for user creation
          // but inform about the role assignment failure
          return {
            success: true,
            message: `User created successfully! However, role assignment failed: ${roleError.message}. Please assign the role manually in the settings.`,
            userId: authData.user.id,
            roleAssignmentFailed: true,
          };
        }

        console.log("Role assigned successfully:", roleData);
      }

      console.log("User creation process completed successfully");
      return {
        success: true,
        message:
          "User created successfully! They can now sign in with their credentials.",
        userId: authData.user.id,
      };
    }

    return {
      success: false,
      error: "Failed to create user - no user data returned",
    };
  } catch (error) {
    console.error("Error in createUserAction:", error);
    return {
      success: false,
      error: "Failed to create user. Please try again.",
    };
  }
};

export const updateUserAction = async (formData: FormData) => {
  const supabase = await createClient();
  const {
    data: { user: currentUser },
  } = await supabase.auth.getUser();

  if (!currentUser) {
    return {
      success: false,
      error: "You must be logged in to update users",
    };
  }

  const userId = formData.get("user_id")?.toString();
  const email = formData.get("email")?.toString();
  const fullName = formData.get("full_name")?.toString();
  const role = formData.get("role")?.toString();

  if (!userId || !email) {
    return {
      success: false,
      error: "User ID and email are required",
    };
  }

  try {
    console.log("Updating user with server action:", {
      userId,
      email,
      full_name: fullName,
      role,
    });

    // Use service role client to bypass RLS for user updates
    const serviceSupabase = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!,
    );

    // Update user in auth system
    const { data: authData, error: authError } =
      await serviceSupabase.auth.admin.updateUserById(userId, {
        email,
        user_metadata: {
          full_name: fullName || null,
        },
      });

    if (authError) {
      console.error("Error updating auth user:", authError);
      return {
        success: false,
        error: "Failed to update user authentication: " + authError.message,
      };
    }

    // Update user in users table
    const { data: userData, error: userError } = await serviceSupabase
      .from("users")
      .update({
        email: email,
        full_name: fullName || null,
        name: fullName || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", userId)
      .select();

    if (userError) {
      console.error("Error updating user in users table:", userError);
      return {
        success: false,
        error: "Failed to update user profile: " + userError.message,
      };
    }

    console.log("User updated in users table:", userData);

    // Update role if specified
    if (role) {
      console.log("Updating user role:", { userId, role });

      // Check if user already has a role
      const { data: existingRole } = await serviceSupabase
        .from("user_roles")
        .select("id")
        .eq("user_id", userId)
        .single();

      if (existingRole) {
        // Update existing role
        const { error: roleUpdateError } = await serviceSupabase
          .from("user_roles")
          .update({ role: role })
          .eq("user_id", userId);

        if (roleUpdateError) {
          console.error("Error updating user role:", roleUpdateError);
          return {
            success: true,
            message: `User updated successfully! However, role update failed: ${roleUpdateError.message}. Please update the role manually.`,
            userId: userId,
            roleUpdateFailed: true,
          };
        }
      } else {
        // Create new role assignment
        const { error: roleCreateError } = await serviceSupabase
          .from("user_roles")
          .insert({
            user_id: userId,
            role: role,
            created_at: new Date().toISOString(),
          });

        if (roleCreateError) {
          console.error("Error creating user role:", roleCreateError);
          return {
            success: true,
            message: `User updated successfully! However, role assignment failed: ${roleCreateError.message}. Please assign the role manually.`,
            userId: userId,
            roleAssignmentFailed: true,
          };
        }
      }

      console.log("User role updated successfully");
    }

    console.log("User update process completed successfully");
    return {
      success: true,
      message: "User updated successfully!",
      userId: userId,
    };
  } catch (error) {
    console.error("Error in updateUserAction:", error);
    return {
      success: false,
      error: "Failed to update user. Please try again.",
    };
  }
};

export const deleteUserAction = async (formData: FormData) => {
  const supabase = await createClient();
  const {
    data: { user: currentUser },
  } = await supabase.auth.getUser();

  if (!currentUser) {
    return {
      success: false,
      error: "You must be logged in to delete users",
    };
  }

  const userId = formData.get("user_id")?.toString();

  if (!userId) {
    return {
      success: false,
      error: "User ID is required",
    };
  }

  // Prevent users from deleting themselves
  if (userId === currentUser.id) {
    return {
      success: false,
      error: "You cannot delete your own account",
    };
  }

  try {
    console.log("Deleting user with server action:", { userId });

    // Use service role client to bypass RLS for user deletion
    const serviceSupabase = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!,
    );

    // First, delete user role assignments
    const { error: roleDeleteError } = await serviceSupabase
      .from("user_roles")
      .delete()
      .eq("user_id", userId);

    if (roleDeleteError) {
      console.error("Error deleting user roles:", roleDeleteError);
      // Continue with user deletion even if role deletion fails
    }

    // Delete user from users table
    const { error: userDeleteError } = await serviceSupabase
      .from("users")
      .delete()
      .eq("id", userId);

    if (userDeleteError) {
      console.error("Error deleting user from users table:", userDeleteError);
      return {
        success: false,
        error: "Failed to delete user profile: " + userDeleteError.message,
      };
    }

    // Delete user from auth system
    const { error: authDeleteError } =
      await serviceSupabase.auth.admin.deleteUser(userId);

    if (authDeleteError) {
      console.error("Error deleting auth user:", authDeleteError);
      return {
        success: false,
        error:
          "Failed to delete user authentication: " + authDeleteError.message,
      };
    }

    console.log("User deletion process completed successfully");
    return {
      success: true,
      message: "User deleted successfully!",
    };
  } catch (error) {
    console.error("Error in deleteUserAction:", error);
    return {
      success: false,
      error: "Failed to delete user. Please try again.",
    };
  }
};

// Currency Management Actions
export const getCurrenciesAction = async () => {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return {
        success: false,
        error: "User not authenticated",
        currencies: [],
      };
    }

    const { data: currencies, error } = await supabase
      .from("currencies")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching currencies:", error);
      return {
        success: false,
        error: "Failed to fetch currencies",
        currencies: [],
      };
    }

    return {
      success: true,
      currencies: currencies || [],
    };
  } catch (error) {
    console.error("Error in getCurrenciesAction:", error);
    return {
      success: false,
      error: "Failed to fetch currencies",
      currencies: [],
    };
  }
};

export const createCurrencyAction = async (formData: FormData) => {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return {
        success: false,
        error: "User not authenticated",
      };
    }

    const code = formData.get("code")?.toString()?.toUpperCase();
    const name = formData.get("name")?.toString();
    const symbol = formData.get("symbol")?.toString();
    const exchange_rate = parseFloat(
      formData.get("exchange_rate")?.toString() || "1",
    );
    const is_default = formData.get("is_default") === "true";

    if (!code || !name || !symbol) {
      return {
        success: false,
        error: "Code, name, and symbol are required",
      };
    }

    // If setting as default, unset other defaults first
    if (is_default) {
      await supabase
        .from("currencies")
        .update({ is_default: false })
        .neq("code", code);
    }

    const { error } = await supabase.from("currencies").insert({
      code,
      name,
      symbol,
      exchange_rate,
      is_default,
    });

    if (error) {
      console.error("Error creating currency:", error);
      return {
        success: false,
        error: "Failed to create currency",
      };
    }

    return {
      success: true,
      message: "Currency created successfully",
    };
  } catch (error) {
    console.error("Error in createCurrencyAction:", error);
    return {
      success: false,
      error: "Failed to create currency",
    };
  }
};

export const updateCurrencyAction = async (formData: FormData) => {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return {
        success: false,
        error: "User not authenticated",
      };
    }

    const id = formData.get("id")?.toString();
    const code = formData.get("code")?.toString()?.toUpperCase();
    const name = formData.get("name")?.toString();
    const symbol = formData.get("symbol")?.toString();
    const exchange_rate = parseFloat(
      formData.get("exchange_rate")?.toString() || "1",
    );
    const is_default = formData.get("is_default") === "true";

    if (!id || !code || !name || !symbol) {
      return {
        success: false,
        error: "ID, code, name, and symbol are required",
      };
    }

    // If setting as default, unset other defaults first
    if (is_default) {
      await supabase
        .from("currencies")
        .update({ is_default: false })
        .neq("id", id);
    }

    const { error } = await supabase
      .from("currencies")
      .update({
        code,
        name,
        symbol,
        exchange_rate,
        is_default,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (error) {
      console.error("Error updating currency:", error);
      return {
        success: false,
        error: "Failed to update currency",
      };
    }

    return {
      success: true,
      message: "Currency updated successfully",
    };
  } catch (error) {
    console.error("Error in updateCurrencyAction:", error);
    return {
      success: false,
      error: "Failed to update currency",
    };
  }
};

export const deleteCurrencyAction = async (formData: FormData) => {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return {
        success: false,
        error: "User not authenticated",
      };
    }

    const id = formData.get("id")?.toString();

    if (!id) {
      return {
        success: false,
        error: "Currency ID is required",
      };
    }

    // Check if it's the default currency
    const { data: currency } = await supabase
      .from("currencies")
      .select("is_default")
      .eq("id", id)
      .single();

    if (currency?.is_default) {
      return {
        success: false,
        error: "Cannot delete the default currency",
      };
    }

    const { error } = await supabase.from("currencies").delete().eq("id", id);

    if (error) {
      console.error("Error deleting currency:", error);
      return {
        success: false,
        error: "Failed to delete currency",
      };
    }

    return {
      success: true,
      message: "Currency deleted successfully",
    };
  } catch (error) {
    console.error("Error in deleteCurrencyAction:", error);
    return {
      success: false,
      error: "Failed to delete currency",
    };
  }
};

export const setDefaultCurrencyAction = async (formData: FormData) => {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return {
        success: false,
        error: "User not authenticated",
      };
    }

    const id = formData.get("id")?.toString();

    if (!id) {
      return {
        success: false,
        error: "Currency ID is required",
      };
    }

    // Unset all defaults first
    await supabase.from("currencies").update({ is_default: false });

    // Set the new default
    const { error } = await supabase
      .from("currencies")
      .update({ is_default: true, updated_at: new Date().toISOString() })
      .eq("id", id);

    if (error) {
      console.error("Error setting default currency:", error);
      return {
        success: false,
        error: "Failed to set default currency",
      };
    }

    return {
      success: true,
      message: "Default currency updated successfully",
    };
  } catch (error) {
    console.error("Error in setDefaultCurrencyAction:", error);
    return {
      success: false,
      error: "Failed to set default currency",
    };
  }
};

// Payment Methods Actions
export const getPaymentMethodsAction = async () => {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return {
        success: false,
        error: "User not authenticated",
        paymentMethods: [],
      };
    }

    const { data: paymentMethods, error } = await supabase
      .from("payment_methods")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching payment methods:", error);
      return {
        success: false,
        error: "Failed to fetch payment methods",
        paymentMethods: [],
      };
    }

    return {
      success: true,
      paymentMethods: paymentMethods || [],
    };
  } catch (error) {
    console.error("Error in getPaymentMethodsAction:", error);
    return {
      success: false,
      error: "Failed to fetch payment methods",
      paymentMethods: [],
    };
  }
};

export const createPaymentMethodAction = async (formData: FormData) => {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return {
        success: false,
        error: "User not authenticated",
      };
    }

    const name = formData.get("name")?.toString();
    const type = formData.get("type")?.toString() || "other";
    const is_active = formData.get("is_active") !== "false";

    if (!name) {
      return {
        success: false,
        error: "Payment method name is required",
      };
    }

    const { error } = await supabase.from("payment_methods").insert({
      name,
      type,
      is_active,
    });

    if (error) {
      console.error("Error creating payment method:", error);
      return {
        success: false,
        error: "Failed to create payment method",
      };
    }

    return {
      success: true,
      message: "Payment method created successfully",
    };
  } catch (error) {
    console.error("Error in createPaymentMethodAction:", error);
    return {
      success: false,
      error: "Failed to create payment method",
    };
  }
};

export const updatePaymentMethodAction = async (formData: FormData) => {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return {
        success: false,
        error: "User not authenticated",
      };
    }

    const id = formData.get("id")?.toString();
    const name = formData.get("name")?.toString();
    const type = formData.get("type")?.toString();
    const is_active = formData.get("is_active") === "true";

    if (!id) {
      return {
        success: false,
        error: "Payment method ID is required",
      };
    }

    const updateData: any = { updated_at: new Date().toISOString() };
    if (name) updateData.name = name;
    if (type) updateData.type = type;
    if (formData.has("is_active")) updateData.is_active = is_active;

    const { error } = await supabase
      .from("payment_methods")
      .update(updateData)
      .eq("id", id);

    if (error) {
      console.error("Error updating payment method:", error);
      return {
        success: false,
        error: "Failed to update payment method",
      };
    }

    return {
      success: true,
      message: "Payment method updated successfully",
    };
  } catch (error) {
    console.error("Error in updatePaymentMethodAction:", error);
    return {
      success: false,
      error: "Failed to update payment method",
    };
  }
};

export const deletePaymentMethodAction = async (formData: FormData) => {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return {
        success: false,
        error: "User not authenticated",
      };
    }

    const id = formData.get("id")?.toString();

    if (!id) {
      return {
        success: false,
        error: "Payment method ID is required",
      };
    }

    const { error } = await supabase
      .from("payment_methods")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Error deleting payment method:", error);
      return {
        success: false,
        error: "Failed to delete payment method",
      };
    }

    return {
      success: true,
      message: "Payment method deleted successfully",
    };
  } catch (error) {
    console.error("Error in deletePaymentMethodAction:", error);
    return {
      success: false,
      error: "Failed to delete payment method",
    };
  }
};

// User Invitations Actions
export const getUserInvitationsAction = async () => {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return {
        success: false,
        error: "User not authenticated",
        invitations: [],
      };
    }

    const { data: invitations, error } = await supabase
      .from("user_invitations")
      .select(
        `
        *,
        invited_by_user:invited_by(full_name, email)
      `,
      )
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching user invitations:", error);
      return {
        success: false,
        error: "Failed to fetch user invitations",
        invitations: [],
      };
    }

    return {
      success: true,
      invitations: invitations || [],
    };
  } catch (error) {
    console.error("Error in getUserInvitationsAction:", error);
    return {
      success: false,
      error: "Failed to fetch user invitations",
      invitations: [],
    };
  }
};

export const createUserInvitationAction = async (formData: FormData) => {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return {
        success: false,
        error: "User not authenticated",
      };
    }

    const email = formData.get("email")?.toString();
    const full_name = formData.get("full_name")?.toString();
    const role = formData.get("role")?.toString() || "accountant";
    const message = formData.get("message")?.toString();

    if (!email) {
      return {
        success: false,
        error: "Email is required",
      };
    }

    // Check if user already exists
    const { data: existingUser } = await supabase
      .from("users")
      .select("id")
      .eq("email", email)
      .single();

    if (existingUser) {
      return {
        success: false,
        error: "A user with this email already exists",
      };
    }

    // Check if invitation already exists
    const { data: existingInvitation } = await supabase
      .from("user_invitations")
      .select("id")
      .eq("email", email)
      .eq("status", "pending")
      .single();

    if (existingInvitation) {
      return {
        success: false,
        error: "A pending invitation already exists for this email",
      };
    }

    // Generate invitation token
    const token = crypto.randomUUID();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days from now

    const { error } = await supabase.from("user_invitations").insert({
      email,
      full_name,
      role,
      message,
      token,
      expires_at: expiresAt.toISOString(),
      invited_by: user.id,
      status: "pending",
    });

    if (error) {
      console.error("Error creating user invitation:", error);
      return {
        success: false,
        error: "Failed to create user invitation",
      };
    }

    return {
      success: true,
      message: "User invitation created successfully",
      token,
    };
  } catch (error) {
    console.error("Error in createUserInvitationAction:", error);
    return {
      success: false,
      error: "Failed to create user invitation",
    };
  }
};

export const updateUserInvitationAction = async (formData: FormData) => {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return {
        success: false,
        error: "User not authenticated",
      };
    }

    const id = formData.get("id")?.toString();
    const status = formData.get("status")?.toString();
    const action = formData.get("action")?.toString();

    if (!id) {
      return {
        success: false,
        error: "Invitation ID is required",
      };
    }

    let updateData: any = { updated_at: new Date().toISOString() };

    if (action === "resend") {
      // Extend expiry date
      const newExpiresAt = new Date();
      newExpiresAt.setDate(newExpiresAt.getDate() + 7);
      updateData.expires_at = newExpiresAt.toISOString();
      updateData.status = "pending";
    } else if (status) {
      updateData.status = status;
    }

    const { error } = await supabase
      .from("user_invitations")
      .update(updateData)
      .eq("id", id);

    if (error) {
      console.error("Error updating user invitation:", error);
      return {
        success: false,
        error: "Failed to update user invitation",
      };
    }

    return {
      success: true,
      message:
        action === "resend"
          ? "Invitation resent successfully"
          : "Invitation updated successfully",
    };
  } catch (error) {
    console.error("Error in updateUserInvitationAction:", error);
    return {
      success: false,
      error: "Failed to update user invitation",
    };
  }
};

export const deleteUserInvitationAction = async (formData: FormData) => {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return {
        success: false,
        error: "User not authenticated",
      };
    }

    const id = formData.get("id")?.toString();

    if (!id) {
      return {
        success: false,
        error: "Invitation ID is required",
      };
    }

    const { error } = await supabase
      .from("user_invitations")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Error deleting user invitation:", error);
      return {
        success: false,
        error: "Failed to delete user invitation",
      };
    }

    return {
      success: true,
      message: "Invitation cancelled successfully",
    };
  } catch (error) {
    console.error("Error in deleteUserInvitationAction:", error);
    return {
      success: false,
      error: "Failed to delete user invitation",
    };
  }
};

// Import and re-export permission actions
import {
  getUserRoleAction as _getUserRoleAction,
  getRolePermissionsAction as _getRolePermissionsAction,
  updateRolePermissionAction as _updateRolePermissionAction,
  initializeDefaultPermissionsAction as _initializeDefaultPermissionsAction,
} from "./actions/permissions";

// Re-export permission actions as individual const declarations
export const getUserRoleAction = _getUserRoleAction;
export const getRolePermissionsAction = _getRolePermissionsAction;
export const updateRolePermissionAction = _updateRolePermissionAction;
export const initializeDefaultPermissionsAction =
  _initializeDefaultPermissionsAction;

export const changeUserPasswordAction = async (formData: FormData) => {
  const supabase = await createClient();
  const {
    data: { user: currentUser },
  } = await supabase.auth.getUser();

  if (!currentUser) {
    return {
      success: false,
      error: "You must be logged in to change user passwords",
    };
  }

  const userId = formData.get("user_id")?.toString();
  const newPassword = formData.get("new_password")?.toString();
  const confirmPassword = formData.get("confirm_password")?.toString();

  if (!userId || !newPassword || !confirmPassword) {
    return {
      success: false,
      error: "User ID, new password, and password confirmation are required",
    };
  }

  if (newPassword !== confirmPassword) {
    return {
      success: false,
      error: "New password and confirmation password do not match",
    };
  }

  if (newPassword.length < 6) {
    return {
      success: false,
      error: "Password must be at least 6 characters long",
    };
  }

  try {
    console.log("Changing user password with server action:", { userId });

    // Use service role client to bypass RLS for password updates
    const serviceSupabase = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!,
    );

    // Update user password in auth system
    const { data: authData, error: authError } =
      await serviceSupabase.auth.admin.updateUserById(userId, {
        password: newPassword,
      });

    if (authError) {
      console.error("Error updating user password:", authError);
      return {
        success: false,
        error: "Failed to update user password: " + authError.message,
      };
    }

    console.log("User password updated successfully");
    return {
      success: true,
      message:
        "User password updated successfully! The user can now sign in with their new password.",
      userId: userId,
    };
  } catch (error) {
    console.error("Error in changeUserPasswordAction:", error);
    return {
      success: false,
      error: "Failed to change user password. Please try again.",
    };
  }
};
